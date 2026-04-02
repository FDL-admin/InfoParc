from django.contrib import admin
from .models import Ticket, Intervention, Evaluation, AcquisitionRequest


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'status', 'priority', 'requester', 'assigned_to', 'created_at')
    list_filter = ('status', 'priority', 'category')
    search_fields = ('title', 'description')


@admin.register(Intervention)
class InterventionAdmin(admin.ModelAdmin):
    list_display = ('ticket', 'technician', 'provider', 'date', 'amount', 'is_paid')
    list_filter = ('is_paid',)


@admin.register(Evaluation)
class EvaluationAdmin(admin.ModelAdmin):
    list_display = ('ticket', 'rating', 'created_at')


@admin.register(AcquisitionRequest)
class AcquisitionRequestAdmin(admin.ModelAdmin):
    list_display = ('requester', 'equipment_type', 'status', 'created_at')
    list_filter = ('status',)