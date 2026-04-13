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

import nmap

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
        Scan réseau et création automatique des machines détectées.
        POST /api/equipment/discover/
        Body optionnel : {"network": "192.168.11.0/24"}
        """
        # Plage réseau — paramétrable, défaut = réseau BUMIGEB
        network = request.data.get('network', '192.168.11.0/24')

        try:
            nm = nmap.PortScanner()
            # -sn = ping scan uniquement (pas de scan de ports)
            # -T4 = vitesse agressive mais raisonnable
            # --host-timeout 2s = on n'attend pas les machines mortes
            nm.scan(hosts=network, arguments='-sn -T4 --host-timeout 2s')
        except nmap.PortScannerError as e:
            return Response(
                {'detail': f'Erreur scanner : {str(e)}. nmap est-il installé ?'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        except Exception as e:
            return Response(
                {'detail': f'Erreur inattendue : {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        created = []    # machines nouvellement ajoutées
        skipped = []    # machines déjà en base

        for host in nm.all_hosts():
            # Récupère le hostname — fallback sur l'IP si vide
            hostname = nm[host].hostname() or f"machine-{host.replace('.', '-')}"

            # Récupère l'adresse MAC si disponible (pas toujours accessible)
            mac = None
            if 'mac' in nm[host]['addresses']:
                mac = nm[host]['addresses']['mac']

            # Vérification doublon : par MAC d'abord, puis par hostname
            if mac and Equipment.objects.filter(serial_number=mac).exists():
                skipped.append({
                    'ip': host,
                    'hostname': hostname,
                    'reason': 'Déjà enregistrée (MAC connue)'
                })
                continue
            
            if Equipment.objects.filter(name=hostname, type='desktop').exists():
                skipped.append({
                    'ip': host,
                    'hostname': hostname,
                    'reason': 'Déjà enregistrée (hostname connu)'
                })
                continue

            # Crée l'équipement en brouillon — MAC dans serial_number, IP dans location
            equipment = Equipment.objects.create(
                name=hostname,
                type='desktop',       # Windows → desktop par défaut
                status='stock',       # brouillon — à compléter
                location=host,        # IP dans le champ location
                site='bobo',          # site par défaut BUMIGEB Bobo
                serial_number=mac,
                # brand, model, department — à compléter par l'admin
            )

            created.append({
                'id': equipment.id,
                'ip': host,
                'hostname': hostname,
                'mac': mac,
            })

        return Response({
            'summary': {
                'scanned': network,
                'hosts_found': len(nm.all_hosts()),
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