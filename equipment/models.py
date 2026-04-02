from django.db import models
from users.models import User, Department


class Equipment(models.Model):

    TYPE_CHOICES = [
        ('desktop', 'Ordinateur de bureau'),
        ('laptop', 'Laptop'),
        ('printer', 'Imprimante'),
        ('scanner', 'Scanner'),
        ('server', 'Serveur'),
        ('network', 'Équipement réseau'),
        ('phone', 'Téléphone'),
        ('other', 'Autre'),
    ]

    STATUS_CHOICES = [
        ('active', 'En service'),
        ('broken', 'En panne'),
        ('repair', 'En réparation'),
        ('retired', 'Mis au rebut'),
        ('stock', 'En stock'),
    ]

    SITE_CHOICES = [
        ('bobo', 'Bobo-Dioulasso'),
        ('ouaga', 'Ouagadougou'),
    ]

    # Informations générales
    name = models.CharField(max_length=100)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    brand = models.CharField(max_length=50, blank=True)
    model = models.CharField(max_length=100, blank=True)
    serial_number = models.CharField(max_length=100, unique=True, blank=True, null=True)

    # Achat
    purchase_date = models.DateField(null=True, blank=True)
    purchase_price = models.DecimalField(
        max_digits=12, decimal_places=2,
        null=True, blank=True
    )
    supplier = models.ForeignKey(
        'Supplier',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='equipments'
    )

    # Affectation
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='stock')
    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='equipments'
    )
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='equipments'
    )
    location = models.CharField(max_length=100, blank=True)
    site = models.CharField(max_length=10, choices=SITE_CHOICES, default='bobo')

    # Règle métier laptop/desktop
    is_laptop = models.BooleanField(default=False)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} — {self.serial_number or 'Sans SN'}"

    def save(self, *args, **kwargs):
        # Auto-détection laptop selon le type
        if self.type == 'laptop':
            self.is_laptop = True
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = "Équipement"
        verbose_name_plural = "Équipements"
        ordering = ['-created_at']


class Supplier(models.Model):

    TYPE_CHOICES = [
        ('supplier', 'Fournisseur'),
        ('provider', 'Prestataire'),
        ('both', 'Les deux'),
    ]

    INTERVENTION_CHOICES = [
        ('onsite', 'Sur site'),
        ('remote', 'À distance'),
        ('both', 'Les deux'),
    ]

    name = models.CharField(max_length=100)
    type = models.CharField(max_length=10, choices=TYPE_CHOICES, default='supplier')
    contact_name = models.CharField(max_length=100, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    intervention_mode = models.CharField(
        max_length=10,
        choices=INTERVENTION_CHOICES,
        default='both'
    )
    notes = models.TextField(blank=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Fournisseur / Prestataire"
        verbose_name_plural = "Fournisseurs / Prestataires"


class Assignment(models.Model):
    equipment = models.ForeignKey(
        Equipment,
        on_delete=models.CASCADE,
        related_name='assignments'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='assignments'
    )
    date_start = models.DateField()
    date_end = models.DateField(null=True, blank=True)
    delivery_note = models.FileField(
        upload_to='delivery_notes/',
        null=True, blank=True
    )
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"{self.equipment} → {self.user} ({self.date_start})"

    class Meta:
        verbose_name = "Affectation"
        verbose_name_plural = "Affectations"
        ordering = ['-date_start']


class SoftwareLicense(models.Model):
    name = models.CharField(max_length=100)
    editor = models.CharField(max_length=100, blank=True)
    license_key = models.CharField(max_length=255, blank=True)
    total_licenses = models.PositiveIntegerField(default=1)
    equipment = models.ManyToManyField(
        Equipment,
        blank=True,
        related_name='licenses'
    )
    expiry_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)

    def __str__(self):
        return self.name

    @property
    def used_licenses(self):
        return self.equipment.count()

    @property
    def available_licenses(self):
        return self.total_licenses - self.used_licenses

    class Meta:
        verbose_name = "Licence logicielle"
        verbose_name_plural = "Licences logicielles"