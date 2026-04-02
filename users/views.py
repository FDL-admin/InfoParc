from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone

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