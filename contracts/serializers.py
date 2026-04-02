from rest_framework import serializers
from .models import Contract, Alert
from equipment.serializers import EquipmentListSerializer, SupplierSerializer


class AlertSerializer(serializers.ModelSerializer):

    class Meta:
        model = Alert
        fields = '__all__'
        read_only_fields = ['created_at', 'sent_at']


class ContractSerializer(serializers.ModelSerializer):
    equipment_detail = EquipmentListSerializer(source='equipment', read_only=True)
    supplier_detail = SupplierSerializer(source='supplier', read_only=True)
    is_expiring_soon = serializers.ReadOnlyField()
    is_expired = serializers.ReadOnlyField()
    alerts = AlertSerializer(many=True, read_only=True)

    class Meta:
        model = Contract
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'status']

    def validate(self, attrs):
        start = attrs.get('start_date')
        end = attrs.get('end_date')
        if start and end and end < start:
            raise serializers.ValidationError(
                "La date de fin ne peut pas être antérieure à la date de début."
            )
        return attrs


class ContractListSerializer(serializers.ModelSerializer):
    equipment_name = serializers.SerializerMethodField()
    supplier_name = serializers.SerializerMethodField()
    is_expiring_soon = serializers.ReadOnlyField()
    is_expired = serializers.ReadOnlyField()

    class Meta:
        model = Contract
        fields = [
            'id', 'name', 'type', 'status',
            'equipment_name', 'supplier_name',
            'start_date', 'end_date',
            'is_expiring_soon', 'is_expired'
        ]

    def get_equipment_name(self, obj):
        return obj.equipment.name if obj.equipment else None

    def get_supplier_name(self, obj):
        return obj.supplier.name if obj.supplier else None