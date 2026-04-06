from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import CustomTokenObtainPairSerializer

from rest_framework.views import APIView
from django.db.models import Count, Avg, Sum
from equipment.models import Equipment
from tickets.models import Ticket, Evaluation
from contracts.models import Contract
from django.utils import timezone
from datetime import timedelta
from django.db import models

from .models import User, Department
from .serializers import (
    UserSerializer, UserCreateSerializer,
    UserUpdateSerializer, ChangePasswordSerializer,
    DepartmentSerializer
)
from .permissions import IsSuperAdmin, IsAdminOrSuperAdmin, IsOwnerOrAdmin


class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsSuperAdmin()]
        return [IsAuthenticated()]


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.select_related('department').all()

    def get_permissions(self):
        if self.action == 'create':
            return [IsSuperAdmin()]
        if self.action == 'destroy':
            return [IsSuperAdmin()]
        if self.action in ('update', 'partial_update'):
            return [IsAdminOrSuperAdmin()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        if self.action in ('update', 'partial_update'):
            return UserUpdateSerializer
        if self.action == 'change_password':
            return ChangePasswordSerializer
        return UserSerializer

    def get_queryset(self):
        user = self.request.user
        # Un user standard ne voit que son propre profil
        if user.role == 'user':
            return User.objects.filter(pk=user.pk)
        return User.objects.select_related('department').all()

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """Profil de l'utilisateur connecté"""
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def change_password(self, request, pk=None):
        user = self.get_object()
        # Un user ne peut changer que son propre mot de passe
        if request.user.role == 'user' and request.user != user:
            return Response(
                {'detail': 'Action non autorisée.'},
                status=status.HTTP_403_FORBIDDEN
            )
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={'request': request}
        )
        if serializer.is_valid():
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            return Response({'detail': 'Mot de passe modifié avec succès.'})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], permission_classes=[IsSuperAdmin])
    def toggle_active(self, request, pk=None):
        """Activer / désactiver un utilisateur"""
        user = self.get_object()
        user.is_active = not user.is_active
        user.save()
        state = 'activé' if user.is_active else 'désactivé'
        return Response({'detail': f"Utilisateur {state}."})
    

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    
class DashboardView(APIView):
    permission_classes = [IsAdminOrSuperAdmin]

    def get(self, request):
        today = timezone.now().date()
        thirty_days_ago = today - timedelta(days=30)
        threshold = today + timedelta(days=30)

        # Stats équipements
        equipment_stats = Equipment.objects.aggregate(
            total=Count('id'),
            active=Count('id', filter=models.Q(status='active')),
            broken=Count('id', filter=models.Q(status='broken')),
            repair=Count('id', filter=models.Q(status='repair')),
            stock=Count('id', filter=models.Q(status='stock')),
        )

        # Répartition par type
        by_type = list(
            Equipment.objects.values('type')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        # Stats tickets
        ticket_stats = Ticket.objects.aggregate(
            total=Count('id'),
            open=Count('id', filter=models.Q(status='open')),
            in_progress=Count('id', filter=models.Q(status='in_progress')),
            resolved=Count('id', filter=models.Q(status='resolved')),
            closed=Count('id', filter=models.Q(status='closed')),
        )

        # Tickets ce mois
        tickets_this_month = Ticket.objects.filter(
            created_at__date__gte=thirty_days_ago
        ).count()

        # Satisfaction moyenne
        avg_rating = Evaluation.objects.aggregate(
            avg=Avg('rating')
        )['avg']

        # Contrats expirant bientôt
        expiring_contracts = Contract.objects.filter(
            end_date__lte=threshold,
            end_date__gte=today
        ).count()

        # Valeur totale du parc
        total_value = Equipment.objects.aggregate(
            total=Sum('purchase_price')
        )['total']

        # Derniers tickets ouverts
        from tickets.serializers import TicketListSerializer
        latest_tickets = Ticket.objects.filter(
            status='open'
        ).select_related(
            'requester', 'assigned_to', 'equipment'
        ).order_by('-created_at')[:5]

        return Response({
            'equipment': {
                **equipment_stats,
                'by_type': by_type,
                'total_value': total_value,
            },
            'tickets': {
                **ticket_stats,
                'this_month': tickets_this_month,
                'latest_open': TicketListSerializer(latest_tickets, many=True).data,
            },
            'satisfaction': {
                'average': round(avg_rating, 2) if avg_rating else None,
            },
            'contracts': {
                'expiring_soon': expiring_contracts,
            },
        })