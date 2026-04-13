from rest_framework import serializers
from .models import Equipment, Supplier, Assignment, SoftwareLicense
from users.serializers import UserSerializer, DepartmentSerializer


class SupplierSerializer(serializers.ModelSerializer):

    class Meta:
        model = Supplier
        fields = '__all__'


class EquipmentSerializer(serializers.ModelSerializer):
    assigned_to_detail = UserSerializer(source='assigned_to', read_only=True)
    department_detail = DepartmentSerializer(source='department', read_only=True)
    supplier_detail = SupplierSerializer(source='supplier', read_only=True)

    class Meta:
        model = Equipment
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'is_laptop']


class EquipmentListSerializer(serializers.ModelSerializer):
    """Serializer allégé pour les listes"""
    assigned_to_name = serializers.SerializerMethodField()
    department_name = serializers.SerializerMethodField()

    class Meta:
        model = Equipment
        fields = [
            'id', 'name', 'type', 'brand', 'model',
            'serial_number', 'status', 'site',
            'assigned_to_name', 'department_name',
            'is_laptop', 'created_at',
            'warranty_end_date', 'lifespan_years',
        ]

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return f"{obj.assigned_to.first_name} {obj.assigned_to.last_name}"
        return None

    def get_department_name(self, obj):
        return obj.department.name if obj.department else None


class AssignmentSerializer(serializers.ModelSerializer):
    equipment_detail = EquipmentListSerializer(source='equipment', read_only=True)
    user_detail = UserSerializer(source='user', read_only=True)

    class Meta:
        model = Assignment
        fields = '__all__'
        read_only_fields = ['equipment', 'date_start']

    def validate(self, attrs):
        equipment = attrs.get('equipment')
        date_end = attrs.get('date_end')
        date_start = attrs.get('date_start')

        if date_end and date_start and date_end < date_start:
            raise serializers.ValidationError(
                "La date de fin ne peut pas être antérieure à la date de début."
            )

        # Vérifie si l'équipement est déjà affecté
        active = Assignment.objects.filter(
            equipment=equipment,
            date_end__isnull=True
        )
        if self.instance:
            active = active.exclude(pk=self.instance.pk)
        if active.exists():
            raise serializers.ValidationError(
                "Cet équipement est déjà affecté à un utilisateur."
            )
        return attrs


class SoftwareLicenseSerializer(serializers.ModelSerializer):
    used_licenses = serializers.ReadOnlyField()
    available_licenses = serializers.ReadOnlyField()

    class Meta:
        model = SoftwareLicense
        fields = '__all__'