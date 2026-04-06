from rest_framework import serializers
from .models import Ticket, Intervention, Evaluation, AcquisitionRequest
from users.serializers import UserSerializer
from equipment.serializers import EquipmentListSerializer
from equipment.serializers import SupplierSerializer


class EvaluationSerializer(serializers.ModelSerializer):

    class Meta:
        model = Evaluation
        fields = '__all__'
        read_only_fields = ['created_at', 'ticket']


class InterventionSerializer(serializers.ModelSerializer):
    technician_detail = UserSerializer(source='technician', read_only=True)
    provider_detail = SupplierSerializer(source='provider', read_only=True)

    class Meta:
        model = Intervention
        fields = '__all__'
        read_only_fields = ['date']


class TicketSerializer(serializers.ModelSerializer):
    requester_detail = UserSerializer(source='requester', read_only=True)
    assigned_to_detail = UserSerializer(source='assigned_to', read_only=True)
    equipment_detail = EquipmentListSerializer(source='equipment', read_only=True)
    interventions = InterventionSerializer(many=True, read_only=True)
    evaluation = EvaluationSerializer(read_only=True)

    class Meta:
        model = Ticket
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'requester']

    def create(self, validated_data):
        # Le requester est toujours l'utilisateur connecté
        validated_data['requester'] = self.context['request'].user
        return super().create(validated_data)


class TicketListSerializer(serializers.ModelSerializer):
    """Serializer allégé pour les listes"""
    requester_name = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()
    equipment_name = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = [
            'id', 'title', 'status', 'priority', 'category',
            'requester_name', 'assigned_to_name', 'equipment_name',
            'created_at', 'resolved_at'
        ]

    def get_requester_name(self, obj):
        return f"{obj.requester.first_name} {obj.requester.last_name}"

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return f"{obj.assigned_to.first_name} {obj.assigned_to.last_name}"
        return None

    def get_equipment_name(self, obj):
        return obj.equipment.name if obj.equipment else None


class TicketStatusUpdateSerializer(serializers.ModelSerializer):
    """Serializer dédié à la mise à jour du statut"""

    class Meta:
        model = Ticket
        fields = ['status', 'assigned_to']

    def validate_status(self, value):
        instance = self.instance
        if not instance:
            return value

        # Transitions autorisées
        transitions = {
            'open': ['assigned'],
            'assigned': ['in_progress', 'open'],
            'in_progress': ['waiting', 'resolved'],
            'waiting': ['in_progress'],
            'resolved': ['closed'],
            'closed': [],
        }
        allowed = transitions.get(instance.status, [])
        if value not in allowed:
            raise serializers.ValidationError(
                f"Transition '{instance.status}' → '{value}' non autorisée."
            )
        return value


class AcquisitionRequestSerializer(serializers.ModelSerializer):
    requester_detail = UserSerializer(source='requester', read_only=True)

    class Meta:
        model = AcquisitionRequest
        fields = '__all__'
        read_only_fields = ['requester', 'created_at', 'updated_at']

    def create(self, validated_data):
        validated_data['requester'] = self.context['request'].user
        return super().create(validated_data)