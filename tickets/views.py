from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone

from .models import Ticket, Intervention, Evaluation, AcquisitionRequest
from .serializers import (
    TicketSerializer, TicketListSerializer,
    TicketStatusUpdateSerializer, InterventionSerializer,
    EvaluationSerializer, AcquisitionRequestSerializer
)
from users.permissions import IsAdminOrSuperAdmin, IsOwnerOrAdmin, IsSuperAdmin


class TicketViewSet(viewsets.ModelViewSet):
    queryset = Ticket.objects.select_related(
        'requester', 'assigned_to', 'equipment'
    ).prefetch_related('interventions', 'evaluation').all()

    def get_permissions(self):
        if self.action == 'destroy':
            return [IsSuperAdmin()]
        if self.action in ('update', 'partial_update', 'update_status'):
            return [IsAdminOrSuperAdmin()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == 'list':
            return TicketListSerializer
        if self.action == 'update_status':
            return TicketStatusUpdateSerializer
        return TicketSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = Ticket.objects.select_related(
            'requester', 'assigned_to', 'equipment'
        ).prefetch_related('interventions', 'evaluation')

        # User standard ne voit que ses propres tickets
        if user.role == 'user':
            queryset = queryset.filter(requester=user)

        # Filtres
        status_ = self.request.query_params.get('status')
        priority = self.request.query_params.get('priority')
        category = self.request.query_params.get('category')

        if status_:
            queryset = queryset.filter(status=status_)
        if priority:
            queryset = queryset.filter(priority=priority)
        if category:
            queryset = queryset.filter(category=category)

        return queryset.order_by('-created_at')

    @action(detail=True, methods=['patch'], permission_classes=[IsAdminOrSuperAdmin])
    def update_status(self, request, pk=None):
        """Mise à jour du statut avec transitions contrôlées"""
        ticket = self.get_object()
        serializer = TicketStatusUpdateSerializer(
            ticket, data=request.data, partial=True
        )
        if serializer.is_valid():
            new_status = serializer.validated_data.get('status')
            # Horodatage automatique
            if new_status == 'resolved':
                ticket.resolved_at = timezone.now()
            if new_status == 'closed':
                ticket.closed_at = timezone.now()
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def add_evaluation(self, request, pk=None):
        """Ajouter une évaluation après résolution"""
        ticket = self.get_object()

        if ticket.requester != request.user:
            return Response(
                {'detail': 'Seul le demandeur peut évaluer ce ticket.'},
                status=status.HTTP_403_FORBIDDEN
            )
        if ticket.status not in ('resolved', 'closed'):
            return Response(
                {'detail': 'Le ticket doit être résolu avant évaluation.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if hasattr(ticket, 'evaluation'):
            return Response(
                {'detail': 'Ce ticket a déjà été évalué.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = EvaluationSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(ticket=ticket)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class InterventionViewSet(viewsets.ModelViewSet):
    queryset = Intervention.objects.select_related(
        'ticket', 'technician', 'provider'
    ).all()
    serializer_class = InterventionSerializer
    permission_classes = [IsAdminOrSuperAdmin]

    def get_queryset(self):
        queryset = super().get_queryset()
        ticket_id = self.request.query_params.get('ticket')
        if ticket_id:
            queryset = queryset.filter(ticket__id=ticket_id)
        return queryset


class AcquisitionRequestViewSet(viewsets.ModelViewSet):
    queryset = AcquisitionRequest.objects.select_related('requester').all()
    serializer_class = AcquisitionRequestSerializer

    def get_permissions(self):
        if self.action in ('update', 'partial_update', 'destroy'):
            return [IsAdminOrSuperAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'user':
            return AcquisitionRequest.objects.filter(requester=user)
        return AcquisitionRequest.objects.select_related('requester').all()