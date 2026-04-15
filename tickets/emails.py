from django.core.mail import send_mail
from django.conf import settings

PRIORITY_LABELS = {
    'low': 'Basse',
    'normal': 'Normale',
    'high': 'Haute',
    'critical': 'Critique',
}

FROM_EMAIL = getattr(settings, 'DEFAULT_FROM_EMAIL', 'InfoParc BUMIGEB <infoparc@bumigeb.bf>')


def send_ticket_created(ticket):
    """Email au demandeur lors de la création d'un ticket."""
    recipient = ticket.requester
    if not recipient or not recipient.email:
        return
    priority_label = PRIORITY_LABELS.get(ticket.priority, ticket.priority)
    try:
        send_mail(
            subject=f'[InfoParc] Votre demande d\'intervention a été enregistrée — {ticket.ticket_number}',
            message=(
                f'Bonjour {recipient.first_name},\n\n'
                f'Votre demande d\'intervention {ticket.ticket_number} "{ticket.title}" a bien été enregistrée.\n'
                f'Priorité : {priority_label}\n\n'
                f'Vous serez notifié dès qu\'un technicien prendra en charge votre demande.\n\n'
                f'-- InfoParc BUMIGEB'
            ),
            from_email=FROM_EMAIL,
            recipient_list=[recipient.email],
            fail_silently=False,
        )
    except Exception:
        pass


def send_ticket_assigned(ticket):
    """Email au demandeur lors de l'assignation du ticket."""
    recipient = ticket.requester
    if not recipient or not recipient.email:
        return
    try:
        send_mail(
            subject=f'[InfoParc] Votre ticket {ticket.ticket_number} a été pris en charge',
            message=(
                f'Bonjour {recipient.first_name},\n\n'
                f'Votre demande {ticket.ticket_number} "{ticket.title}" a été assignée à un technicien '
                f'et est en cours de traitement.\n\n'
                f'-- InfoParc BUMIGEB'
            ),
            from_email=FROM_EMAIL,
            recipient_list=[recipient.email],
            fail_silently=False,
        )
    except Exception:
        pass


def send_ticket_resolved(ticket):
    """Email au demandeur lors de la résolution du ticket."""
    recipient = ticket.requester
    if not recipient or not recipient.email:
        return
    try:
        send_mail(
            subject=f'[InfoParc] Votre ticket {ticket.ticket_number} a été résolu',
            message=(
                f'Bonjour {recipient.first_name},\n\n'
                f'Votre demande {ticket.ticket_number} "{ticket.title}" a été marquée comme résolue.\n'
                f'Vous pouvez vous connecter sur InfoParc pour évaluer l\'intervention.\n\n'
                f'-- InfoParc BUMIGEB'
            ),
            from_email=FROM_EMAIL,
            recipient_list=[recipient.email],
            fail_silently=False,
        )
    except Exception:
        pass


def send_ticket_closed(ticket):
    """Email au demandeur lors de la clôture du ticket."""
    recipient = ticket.requester
    if not recipient or not recipient.email:
        return
    try:
        send_mail(
            subject=f'[InfoParc] Votre ticket {ticket.ticket_number} est clôturé',
            message=(
                f'Bonjour {recipient.first_name},\n\n'
                f'Votre demande {ticket.ticket_number} "{ticket.title}" a été clôturée.\n'
                f'Merci d\'avoir utilisé InfoParc.\n\n'
                f'-- InfoParc BUMIGEB'
            ),
            from_email=FROM_EMAIL,
            recipient_list=[recipient.email],
            fail_silently=False,
        )
    except Exception:
        pass
