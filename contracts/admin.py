from django.contrib import admin
from .models import Contract, Alert


@admin.register(Contract)
class ContractAdmin(admin.ModelAdmin):
    list_display = ('name', 'type', 'equipment', 'supplier', 'start_date', 'end_date', 'status')
    list_filter = ('type', 'status')
    search_fields = ('name', 'reference')


@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = ('type', 'status', 'message', 'created_at')
    list_filter = ('type', 'status')