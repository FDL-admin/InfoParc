from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone

from .models import Contract, Alert
from .serializers import (
    ContractSerializer, ContractListSerializer, AlertSerializer
)
from users.permissions import IsAdminOrSuperAdmin, IsSuperAdmin


class ContractViewSet(viewsets.ModelViewSet):
    queryset = Contract.objects.select_related(
        'equipment', 'supplier'
    ).prefetch_related('alerts').all()

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdminOrSuperAdmin()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == 'list':
            return ContractListSerializer
        return ContractSerializer

    def get_queryset(self):
        queryset = Contract.objects.select_related('equipment', 'supplier')
        type_ = self.request.query_params.get('type')
        status_ = self.request.query_params.get('status')
        expiring = self.request.query_params.get('expiring_soon')

        if type_:
            queryset = queryset.filter(type=type_)
        if status_:
            queryset = queryset.filter(status=status_)
        if expiring == 'true':
            from datetime import timedelta
            threshold = timezone.now().date() + timedelta(days=30)
            queryset = queryset.filter(
                end_date__lte=threshold,
                end_date__gte=timezone.now().date()
            )
        return queryset.order_by('end_date')

    @action(detail=False, methods=['get'], permission_classes=[IsAdminOrSuperAdmin])
    def expiring_soon(self, request):
        """Contrats expirant dans les 30 prochains jours"""
        from datetime import timedelta
        threshold = timezone.now().date() + timedelta(days=30)
        contracts = Contract.objects.filter(
            end_date__lte=threshold,
            end_date__gte=timezone.now().date()
        ).select_related('equipment', 'supplier')
        serializer = ContractListSerializer(contracts, many=True)
        return Response(serializer.data)


class AlertViewSet(viewsets.ModelViewSet):
    queryset = Alert.objects.all()
    serializer_class = AlertSerializer
    permission_classes = [IsAdminOrSuperAdmin]

    def get_queryset(self):
        queryset = Alert.objects.all()
        status_ = self.request.query_params.get('status')
        type_ = self.request.query_params.get('type')
        if status_:
            queryset = queryset.filter(status=status_)
        if type_:
            queryset = queryset.filter(type=type_)
        return queryset.order_by('-created_at')

    @action(detail=True, methods=['post'])
    def dismiss(self, request, pk=None):
        """Ignorer une alerte"""
        alert = self.get_object()
        alert.status = 'dismissed'
        alert.save()
        return Response({'detail': 'Alerte ignorée.'})