from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class Department(models.Model):
    SITE_CHOICES = [
        ('bobo', 'Bobo-Dioulasso'),
        ('ouaga', 'Ouagadougou'),
    ]

    name = models.CharField(max_length=100)
    sigle = models.CharField(max_length=20, unique=True)
    site = models.CharField(max_length=10, choices=SITE_CHOICES, default='bobo')
    description = models.TextField(blank=True)

    def __str__(self):
        return self.sigle

    class Meta:
        verbose_name = "Département"
        verbose_name_plural = "Départements"


class UserManager(BaseUserManager):

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("L'email est obligatoire")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('role', 'superadmin')
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = [
        ('user', 'Utilisateur standard'),
        ('admin', 'Admin technicien'),
        ('superadmin', 'Superadmin'),
    ]

    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    role = models.CharField(max_length=15, choices=ROLE_CHOICES, default='user')
    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='users'
    )
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.role})"

    @property
    def is_admin(self):
        return self.role in ('admin', 'superadmin')

    @property
    def is_superadmin(self):
        return self.role == 'superadmin'

    class Meta:
        verbose_name = "Utilisateur"
        verbose_name_plural = "Utilisateurs"