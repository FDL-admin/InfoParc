from django.contrib import admin
from .models import Equipment, Supplier, Assignment, SoftwareLicense


@admin.register(Equipment)
class EquipmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'type', 'status', 'assigned_to', 'department', 'site')
    list_filter = ('type', 'status', 'site', 'department')
    search_fields = ('name', 'serial_number', 'brand', 'model')


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ('name', 'type', 'intervention_mode', 'email', 'phone')


@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    list_display = ('equipment', 'user', 'date_start', 'date_end')
    list_filter = ('date_start',)


@admin.register(SoftwareLicense)
class SoftwareLicenseAdmin(admin.ModelAdmin):
    list_display = ('name', 'editor', 'total_licenses', 'used_licenses', 'expiry_date')