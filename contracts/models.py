from django.db import models
from equipment.models import Equipment, Supplier


class Contract(models.Model):

    TYPE_CHOICES = [
        ('warranty', 'Garantie'),
        ('maintenance', 'Maintenance'),
        ('support', 'Support'),
        ('lease', 'Leasing'),
        ('other', 'Autre'),
    ]

    STATUS_CHOICES = [
        ('active', 'Actif'),
        ('expired', 'Expiré'),
        ('pending', 'En attente'),
        ('cancelled', 'Résilié'),
    ]

    # Infos principales
    name = models.CharField(max_length=200)
    type = models.CharField(max_length=15, choices=TYPE_CHOICES, default='warranty')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')

    # Relations
    equipment = models.ForeignKey(
        Equipment,
        on_delete=models.CASCADE,
        related_name='contracts'
    )
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='contracts'
    )

    # Dates
    start_date = models.DateField()
    end_date = models.DateField()
    alert_days = models.PositiveIntegerField(
        default=30,
        help_text="Nombre de jours avant expiration pour déclencher l'alerte"
    )

    # Infos complémentaires
    reference = models.CharField(max_length=100, blank=True)
    amount = models.DecimalField(
        max_digits=12, decimal_places=2,
        null=True, blank=True
    )
    document = models.FileField(
        upload_to='contracts/',
        null=True, blank=True
    )
    notes = models.TextField(blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} — {self.equipment} [{self.type}]"

    @property
    def is_expiring_soon(self):
        from django.utils import timezone
        from datetime import timedelta
        today = timezone.now().date()
        return today <= self.end_date <= today + timedelta(days=self.alert_days)

    @property
    def is_expired(self):
        from django.utils import timezone
        return timezone.now().date() > self.end_date

    def save(self, *args, **kwargs):
        # Met à jour le statut automatiquement
        from django.utils import timezone
        today = timezone.now().date()
        if today > self.end_date:
            self.status = 'expired'
        elif today <= self.end_date:
            self.status = 'active'
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = "Contrat"
        verbose_name_plural = "Contrats"
        ordering = ['end_date']


class Alert(models.Model):

    TYPE_CHOICES = [
        ('contract_expiry', 'Expiration contrat'),
        ('warranty_expiry', 'Expiration garantie'),
        ('license_expiry', 'Expiration licence'),
        ('equipment_return', 'Retour équipement'),
        ('maintenance', 'Maintenance planifiée'),
    ]

    STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('sent', 'Envoyée'),
        ('dismissed', 'Ignorée'),
    ]

    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    message = models.TextField()

    # Relations optionnelles selon le type
    contract = models.ForeignKey(
        Contract,
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name='alerts'
    )
    equipment = models.ForeignKey(
        Equipment,
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name='alerts'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"[{self.type}] {self.message[:50]}"

    class Meta:
        verbose_name = "Alerte"
        verbose_name_plural = "Alertes"
        ordering = ['-created_at']