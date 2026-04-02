from rest_framework.permissions import BasePermission


class IsSuperAdmin(BasePermission):
    """Superadmin uniquement"""

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            request.user.role == 'superadmin'
        )


class IsAdminOrSuperAdmin(BasePermission):
    """Admin technicien ou superadmin"""

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            request.user.role in ('admin', 'superadmin')
        )


class IsOwnerOrAdmin(BasePermission):
    """Propriétaire de l'objet ou admin"""

    def has_object_permission(self, request, view, obj):
        if request.user.role in ('admin', 'superadmin'):
            return True
        # Vérifie selon le type d'objet
        if hasattr(obj, 'requester'):
            return obj.requester == request.user
        if hasattr(obj, 'user'):
            return obj.user == request.user
        return False


class IsAuthenticatedReadOnly(BasePermission):
    """Lecture seule pour tous les authentifiés"""

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return True
        return request.user.role in ('admin', 'superadmin')