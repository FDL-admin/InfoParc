from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.views.decorators.http import require_POST

from equipment.models import Equipment
from tickets.models import Ticket
from contracts.models import Contract
from tickets.models import Evaluation
from django.db.models import Count, Avg, Sum
from django.utils import timezone
from datetime import timedelta


def login_view(request):
    if request.user.is_authenticated:
        return redirect('core_dashboard' if request.user.is_admin else 'ticket_list')

    if request.method == 'POST':
        email = request.POST.get('username')
        password = request.POST.get('password')
        user = authenticate(request, username=email, password=password)
        if user:
            login(request, user)
            return redirect('core_dashboard' if user.is_admin else 'ticket_list')
        else:
            return render(request, 'core/login.html', {'form': {'errors': True}})

    return render(request, 'core/login.html')


def logout_view(request):
    logout(request)
    return redirect('login')


@login_required
def dashboard_view(request):
    if not request.user.is_admin:
        return redirect('ticket_list')

    today = timezone.now().date()
    threshold = today + timedelta(days=30)
    thirty_days_ago = today - timedelta(days=30)

    latest_tickets = Ticket.objects.filter(
        status='open'
    ).select_related('requester').order_by('-created_at')[:5]

    stats = {
        'equipment': {
            'total': Equipment.objects.count(),
            'active': Equipment.objects.filter(status='active').count(),
            'broken': Equipment.objects.filter(status='broken').count(),
        },
        'tickets': {
            'open': Ticket.objects.filter(status='open').count(),
            'in_progress': Ticket.objects.filter(status='in_progress').count(),
            'this_month': Ticket.objects.filter(created_at__date__gte=thirty_days_ago).count(),
            'latest_open': latest_tickets,
        },
        'satisfaction': {
            'average': Evaluation.objects.aggregate(avg=Avg('rating'))['avg'],
        },
        'contracts': {
            'expiring_soon': Contract.objects.filter(
                end_date__lte=threshold,
                end_date__gte=today
            ).count(),
        },
    }

    return render(request, 'core/dashboard.html', {'stats': stats})


@login_required
def equipment_list_view(request):
    if not request.user.is_admin:
        return redirect('ticket_list')
    equipments = Equipment.objects.select_related(
        'assigned_to', 'department'
    ).all()
    return render(request, 'core/equipment_list.html', {'equipments': equipments})


@login_required
def ticket_list_view(request):
    if request.user.is_admin:
        tickets = Ticket.objects.select_related(
            'requester', 'assigned_to'
        ).all().order_by('-created_at')
    else:
        tickets = Ticket.objects.filter(
            requester=request.user
        ).order_by('-created_at')
    return render(request, 'core/ticket_list.html', {'tickets': tickets})


@login_required
def ticket_create_view(request):
    if request.method == 'POST':
        title = request.POST.get('title')
        description = request.POST.get('description')
        category = request.POST.get('category')
        priority = request.POST.get('priority')
        equipment_id = request.POST.get('equipment')

        ticket = Ticket(
            title=title,
            description=description,
            category=category,
            priority=priority,
            requester=request.user,
            status='open',
        )
        if equipment_id:
            try:
                ticket.equipment = Equipment.objects.get(pk=equipment_id)
            except Equipment.DoesNotExist:
                pass
        ticket.save()
        messages.success(request, 'Votre demande a été soumise avec succès.')
        return redirect('ticket_list')

    # Équipements affectés à l'utilisateur
    if request.user.is_admin:
        equipments = Equipment.objects.all()
    else:
        equipments = Equipment.objects.filter(assigned_to=request.user)

    return render(request, 'core/ticket_create.html', {'equipments': equipments})