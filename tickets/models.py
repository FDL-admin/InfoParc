from django.db import models
from users.models import User
from equipment.models import Equipment, Supplier
from django.conf import settings


class Ticket(models.Model):

    STATUS_CHOICES = [
        ('open', 'Ouvert'),
        ('assigned', 'Assigné'),
        ('in_progress', 'En cours'),
        ('waiting', 'En attente'),
        ('resolved', 'Résolu'),
        ('closed', 'Clôturé'),
    ]

    PRIORITY_CHOICES = [
        ('low', 'Basse'),
        ('normal', 'Normale'),
        ('high', 'Haute'),
        ('critical', 'Critique'),
    ]

    CATEGORY_CHOICES = [
        ('hardware', 'Panne matérielle'),
        ('software', 'Logiciel'),
        ('network', 'Réseau'),
        ('printer', 'Imprimante'),
        ('other', 'Autre'),
    ]

    # Infos principales
    title = models.CharField(max_length=200)
    description = models.TextField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='other')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='normal')
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='open')
    ticket_number = models.CharField(max_length=20, unique=False, blank=True)
    observations = models.TextField(blank=True)


    # Relations
    equipment = models.ForeignKey(
        Equipment,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='tickets'
    )
    requester = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='requested_tickets'
    )
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='assigned_tickets'
    )

    # Dates
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    # Clôture
    closed_at = models.DateTimeField(null=True, blank=True)
    closed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='closed_tickets'
    )

    # Archivage
    is_archived = models.BooleanField(default=False)
    archived_at = models.DateTimeField(null=True, blank=True)
    archived_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='archived_tickets'
    )

    def __str__(self):
        return f"#{self.id} — {self.title} [{self.status}]"
    
    def save(self, *args, **kwargs):
        if not self.ticket_number:
            from django.utils import timezone
            year = timezone.now().year
            count = Ticket.objects.filter(
                created_at__year=year
            ).count() + 1
            self.ticket_number = f"TK-{year}-{str(count).zfill(4)}"
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = "Ticket"
        verbose_name_plural = "Tickets"
        ordering = ['-created_at']


class Intervention(models.Model):

    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name='interventions'
    )
    technician = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='interventions'
    )
    provider = models.ForeignKey(
        Supplier,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='interventions'
    )

    description = models.TextField()
    date = models.DateTimeField(auto_now_add=True)
    duration_minutes = models.PositiveIntegerField(null=True, blank=True)
    
    # DI BUMIGEB
    materials_provided = models.TextField(blank=True)
    end_time = models.DateTimeField(null=True, blank=True)
    purchase_order_number = models.CharField(max_length=50, blank=True)
    
    # Facturation
    invoice = models.FileField(
        upload_to='invoices/',
        null=True, blank=True
    )
    amount = models.DecimalField(
        max_digits=12, decimal_places=2,
        null=True, blank=True
    )
    is_paid = models.BooleanField(default=False)

    def __str__(self):
        return f"Intervention ticket #{self.ticket.id} — {self.date}"

    class Meta:
        verbose_name = "Intervention"
        verbose_name_plural = "Interventions"
        ordering = ['-date']


class Evaluation(models.Model):

    RATING_CHOICES = [(i, str(i)) for i in range(1, 6)]

    ticket = models.OneToOneField(
        Ticket,
        on_delete=models.CASCADE,
        related_name='evaluation'
    )
    rating = models.PositiveSmallIntegerField(choices=RATING_CHOICES)
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Évaluation ticket #{self.ticket.id} — {self.rating}/5"

    class Meta:
        verbose_name = "Évaluation"
        verbose_name_plural = "Évaluations"


class AcquisitionRequest(models.Model):

    STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('approved', 'Approuvée'),
        ('rejected', 'Rejetée'),
        ('fulfilled', 'Satisfaite'),
    ]

    requester = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='acquisition_requests'
    )
    equipment_type = models.CharField(max_length=100)
    justification = models.TextField()
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='pending'
    )
    admin_comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Demande {self.equipment_type} — {self.requester} [{self.status}]"

    class Meta:
        verbose_name = "Demande d'acquisition"
        verbose_name_plural = "Demandes d'acquisition"
        ordering = ['-created_at']