from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Equipment, Supplier, Assignment, SoftwareLicense
from .serializers import (
    EquipmentSerializer, EquipmentListSerializer,
    SupplierSerializer, AssignmentSerializer,
    SoftwareLicenseSerializer
)
from users.permissions import IsAdminOrSuperAdmin, IsSuperAdmin

import subprocess
import socket
import platform
import concurrent.futures
from ipaddress import IPv4Network

class EquipmentViewSet(viewsets.ModelViewSet):
    queryset = Equipment.objects.select_related(
        'department', 'assigned_to', 'supplier'
    ).all()
    
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['type', 'status', 'site', 'department', 'is_laptop']
    search_fields = ['name', 'serial_number', 'brand', 'model']
    ordering_fields = ['name', 'created_at', 'purchase_date']
    ordering = ['-created_at']

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy', 'discover'):
            return [IsAdminOrSuperAdmin()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == 'list':
            return EquipmentListSerializer
        return EquipmentSerializer

    def get_queryset(self):
        queryset = Equipment.objects.select_related(
            'department', 'assigned_to', 'supplier'
        )
        # Filtres optionnels via query params
        type_ = self.request.query_params.get('type')
        status_ = self.request.query_params.get('status')
        site = self.request.query_params.get('site')
        department = self.request.query_params.get('department')

        if type_:
            queryset = queryset.filter(type=type_)
        if status_:
            queryset = queryset.filter(status=status_)
        if site:
            queryset = queryset.filter(site=site)
        if department:
            queryset = queryset.filter(department__sigle=department)

        return queryset

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrSuperAdmin])
    def assign(self, request, pk=None):
        """Affecter un équipement à un utilisateur"""
        equipment = self.get_object()
        serializer = AssignmentSerializer(
            data=request.data,
            context={'request': request}
        )
        if serializer.is_valid():
            # Clôture l'affectation précédente si elle existe
            Assignment.objects.filter(
                equipment=equipment,
                date_end__isnull=True
            ).update(date_end=timezone.now().date())

            # Met à jour l'équipement
            user = serializer.validated_data['user']
            equipment.assigned_to = user
            equipment.status = 'active'
            equipment.save()

            serializer.save(equipment=equipment)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrSuperAdmin])
    def unassign(self, request, pk=None):
        """Retirer l'affectation d'un équipement"""
        equipment = self.get_object()
        Assignment.objects.filter(
            equipment=equipment,
            date_end__isnull=True
        ).update(date_end=timezone.now().date())

        equipment.assigned_to = None
        equipment.status = 'stock'
        equipment.save()
        return Response({'detail': 'Équipement désaffecté avec succès.'})

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def history(self, request, pk=None):
        """Historique complet des affectations"""
        equipment = self.get_object()
        assignments = Assignment.objects.filter(
            equipment=equipment
        ).select_related('user').order_by('-date_start')
        serializer = AssignmentSerializer(assignments, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'], permission_classes=[IsAdminOrSuperAdmin])
    def discover(self, request):
        """
        Scan réseau sans dépendance externe — ping + ARP.
        POST /api/equipment/discover/
        Body optionnel : {"network": "192.168.11.0/24"}
        """
        network_str = request.data.get('network', '192.168.11.0/24')

        try:
            network = IPv4Network(network_str, strict=False)
        except ValueError as e:
            return Response({'detail': f'Plage réseau invalide : {e}'}, status=status.HTTP_400_BAD_REQUEST)

        # Limite à /22 pour éviter les scans trop longs
        if network.prefixlen < 22:
            return Response({'detail': 'Plage réseau trop large (max /22).'}, status=status.HTTP_400_BAD_REQUEST)

        is_windows = platform.system() == 'Windows'

        def ping(ip):
            """Retourne True si l'hôte répond au ping."""
            try:
                if is_windows:
                    cmd = ['ping', '-n', '1', '-w', '800', str(ip)]
                else:
                    cmd = ['ping', '-c', '1', '-W', '1', str(ip)]
                r = subprocess.run(cmd, capture_output=True, timeout=3)
                return r.returncode == 0
            except Exception:
                return False

        def resolve_hostname(ip):
            try:
                return socket.gethostbyaddr(str(ip))[0]
            except Exception:
                return f"machine-{str(ip).replace('.', '-')}"

        def get_arp_table():
            """Retourne un dict {ip: mac} depuis la table ARP locale."""
            macs = {}
            try:
                enc = 'cp1252' if is_windows else 'utf-8'
                r = subprocess.run(['arp', '-a'], capture_output=True, timeout=5)
                output = r.stdout.decode(enc, errors='replace')
                for line in output.splitlines():
                    parts = line.split()
                    if len(parts) < 2:
                        continue
                    if is_windows:
                        # Windows : "192.168.1.1  aa-bb-cc-dd-ee-ff  dynamic"
                        ip_part  = parts[0]
                        mac_part = parts[1] if len(parts) > 1 else None
                    else:
                        # Linux : "? (192.168.1.1) at aa:bb:cc:dd:ee:ff [ether] on eth0"
                        ip_part  = parts[1].strip('()')
                        mac_part = parts[3] if len(parts) > 3 else None
                    if mac_part and ('-' in mac_part or ':' in mac_part):
                        macs[ip_part] = mac_part.upper().replace('-', ':')
            except Exception:
                pass
            return macs

        # Scan en parallèle (max 64 threads)
        hosts_up = []
        ips = [str(ip) for ip in network.hosts()]
        with concurrent.futures.ThreadPoolExecutor(max_workers=64) as ex:
            results = ex.map(ping, ips)
        for ip, alive in zip(ips, results):
            if alive:
                hosts_up.append(ip)

        # Table ARP pour les MAC
        arp = get_arp_table()

        created, skipped = [], []

        for host in hosts_up:
            mac      = arp.get(host)
            hostname = resolve_hostname(host)

            # Doublon par MAC
            if mac and Equipment.objects.filter(serial_number=mac).exists():
                skipped.append({'ip': host, 'hostname': hostname, 'reason': 'MAC déjà connue'})
                continue

            # Doublon par IP (location)
            if Equipment.objects.filter(location=host).exists():
                skipped.append({'ip': host, 'hostname': hostname, 'reason': 'IP déjà enregistrée'})
                continue

            eq = Equipment.objects.create(
                name=hostname,
                type='desktop',
                status='stock',
                location=host,
                site='bobo',
                serial_number=mac or None,
            )
            created.append({'id': eq.id, 'ip': host, 'hostname': hostname, 'mac': mac})

        return Response({
            'summary': {
                'scanned': network_str,
                'hosts_found': len(hosts_up),
                'created': len(created),
                'skipped': len(skipped),
            },
            'created': created,
            'skipped': skipped,
        }, status=status.HTTP_201_CREATED)


class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdminOrSuperAdmin()]
        return [IsAuthenticated()]


class AssignmentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Assignment.objects.select_related(
        'equipment', 'user'
    ).all()
    serializer_class = AssignmentSerializer
    permission_classes = [IsAdminOrSuperAdmin]


class SoftwareLicenseViewSet(viewsets.ModelViewSet):
    queryset = SoftwareLicense.objects.prefetch_related('equipment').all()
    serializer_class = SoftwareLicenseSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdminOrSuperAdmin()]
        return [IsAuthenticated()]