from django.urls import path
from . import views

urlpatterns = [
    path('', views.login_view, name='login'),
    path('app/logout/', views.logout_view, name='logout'),
    path('app/dashboard/', views.dashboard_view, name='core_dashboard'),
    path('app/equipements/', views.equipment_list_view, name='equipment_list'),
    path('app/tickets/', views.ticket_list_view, name='ticket_list'),
    path('app/tickets/nouveau/', views.ticket_create_view, name='ticket_create'),
]