from datetime import timedelta
from django.utils import timezone
from django.core.mail import send_mail

from .models import Contract, Alert
from users.models import User


def get_admin_emails():
    return list(
        User.objects.filter(
            role__in=['admin', 'superadmin'],
            is_active=True,
            email__isnull=False,
        ).exclude(email='')
        .values_list('email', flat=True)
    )


def check_expiring_contracts():
    today = timezone.now().date()

    contracts = Contract.objects.select_related('equipment').filter(
        status='active',
        end_date__gte=today,
    )

    for contract in contracts:
        threshold = today + timedelta(days=contract.alert_days)
        if contract.end_date > threshold:
            continue

        already_alerted = Alert.objects.filter(
            contract=contract,
            type='contract_expiry',
            status='pending',
        ).exists()
        if already_alerted:
            continue

        days_left = (contract.end_date - today).days
        alert = Alert.objects.create(
            type='contract_expiry',
            contract=contract,
            equipment=contract.equipment,
            message=(
                f"Le contrat \"{contract.name}\" expire dans {days_left} jour(s) "
                f"({contract.end_date.strftime('%d/%m/%Y')})"
            ),
            status='pending',
        )
        try:
            send_mail(
                subject=f'[InfoParc] Contrat expirant bientôt — {contract.name}',
                message=f"""Bonjour,

Le contrat "{contract.name}" associé à l'équipement \
"{contract.equipment.name}" expire le {contract.end_date.strftime('%d/%m/%Y')}.

Il vous reste {days_left} jour(s) avant expiration.

Référence contrat : {contract.reference or '—'}
Type : {contract.get_type_display()}

Connectez-vous sur InfoParc pour consulter ce contrat.

— InfoParc BUMIGEB""",
                from_email='InfoParc BUMIGEB <infoparc@bumigeb.bf>',
                recipient_list=get_admin_emails(),
                fail_silently=True,
            )
            alert.status = 'sent'
            alert.sent_at = timezone.now()
            alert.save()
        except Exception:
            pass


def check_expiring_licenses():
    from equipment.models import SoftwareLicense

    today = timezone.now().date()
    threshold = today + timedelta(days=30)

    licenses = SoftwareLicense.objects.filter(
        expiry_date__lte=threshold,
        expiry_date__gte=today,
    )

    for license in licenses:
        already_alerted = Alert.objects.filter(
            type='license_expiry',
            status='pending',
            message__icontains=license.name,
        ).exists()
        if already_alerted:
            continue

        days_left = (license.expiry_date - today).days
        alert = Alert.objects.create(
            type='license_expiry',
            message=(
                f"La licence \"{license.name}\" expire dans {days_left} jour(s) "
                f"({license.expiry_date.strftime('%d/%m/%Y')})"
            ),
            status='pending',
        )
        try:
            send_mail(
                subject=f'[InfoParc] Licence logicielle expirant bientôt — {license.name}',
                message=f"""Bonjour,

La licence logicielle "{license.name}" expire le {license.expiry_date.strftime('%d/%m/%Y')}.

Il vous reste {days_left} jour(s) avant expiration.

Licences utilisées : {license.used_licenses} / {license.total_licenses}

Connectez-vous sur InfoParc pour consulter cette licence.

— InfoParc BUMIGEB""",
                from_email='InfoParc BUMIGEB <infoparc@bumigeb.bf>',
                recipient_list=get_admin_emails(),
                fail_silently=True,
            )
            alert.status = 'sent'
            alert.sent_at = timezone.now()
            alert.save()
        except Exception:
            pass


def check_expiring_warranties():
    from equipment.models import Equipment

    today = timezone.now().date()
    threshold = today + timedelta(days=30)

    equipments = Equipment.objects.select_related('department').filter(
        warranty_end_date__lte=threshold,
        warranty_end_date__gte=today,
        status__in=['active', 'repair'],
    )

    for equipment in equipments:
        already_alerted = Alert.objects.filter(
            equipment=equipment,
            type='warranty_expiry',
            status='pending',
        ).exists()
        if already_alerted:
            continue

        days_left = (equipment.warranty_end_date - today).days
        alert = Alert.objects.create(
            type='warranty_expiry',
            equipment=equipment,
            message=(
                f"Garantie de l'équipement {equipment.name} expire dans {days_left} jour(s) "
                f"({equipment.warranty_end_date.strftime('%d/%m/%Y')})"
            ),
            status='pending',
        )
        try:
            send_mail(
                subject=f'[InfoParc] Garantie expirant bientôt — {equipment.name}',
                message=f"""Bonjour,

La garantie de l'équipement "{equipment.name}" \
(N° série : {equipment.serial_number or '—'}) \
expire le {equipment.warranty_end_date.strftime('%d/%m/%Y')}.

Il vous reste {days_left} jour(s).

Département : {equipment.department.name if equipment.department else '—'}

Connectez-vous sur InfoParc pour consulter cet équipement.

— InfoParc BUMIGEB""",
                from_email='InfoParc BUMIGEB <infoparc@bumigeb.bf>',
                recipient_list=get_admin_emails(),
                fail_silently=True,
            )
            alert.status = 'sent'
            alert.sent_at = timezone.now()
            alert.save()
        except Exception:
            pass
