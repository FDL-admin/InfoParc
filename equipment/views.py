from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone

from .models import Equipment, Supplier, Assignment, SoftwareLicense
from .serializers import (
    EquipmentSerializer, EquipmentListSerializer,
    SupplierSerializer, AssignmentSerializer,
    SoftwareLicenseSerializer
)
from users.permissions import IsAdminOrSuperAdmin, IsSuperAdmin


class EquipmentViewSet(viewsets.ModelViewSet):
    queryset = Equipment.objects.select_related(
        'department', 'assigned_to', 'supplier'
    ).all()

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
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