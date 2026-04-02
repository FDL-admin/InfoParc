"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter

from users.views import UserViewSet, DepartmentViewSet
from equipment.views import (
    EquipmentViewSet, SupplierViewSet,
    AssignmentViewSet, SoftwareLicenseViewSet
)
from tickets.views import (
    TicketViewSet, InterventionViewSet, AcquisitionRequestViewSet
)
from contracts.views import ContractViewSet, AlertViewSet

router = DefaultRouter()

# Users
router.register(r'users', UserViewSet, basename='user')
router.register(r'departments', DepartmentViewSet, basename='department')

# Equipment
router.register(r'equipment', EquipmentViewSet, basename='equipment')
router.register(r'suppliers', SupplierViewSet, basename='supplier')
router.register(r'assignments', AssignmentViewSet, basename='assignment')
router.register(r'licenses', SoftwareLicenseViewSet, basename='license')

# Tickets
router.register(r'tickets', TicketViewSet, basename='ticket')
router.register(r'interventions', InterventionViewSet, basename='intervention')
router.register(r'acquisitions', AcquisitionRequestViewSet, basename='acquisition')

# Contracts
router.register(r'contracts', ContractViewSet, basename='contract')
router.register(r'alerts', AlertViewSet, basename='alert')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api-auth/', include('rest_framework.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)