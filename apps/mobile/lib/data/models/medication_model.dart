// Medication data model
class MedicationModel {
  final String id;
  final String userId;
  final String name;
  final String? genericName;
  final String dosage;
  final String form;
  final String? instructions;
  final bool isCritical;
  final bool isActive;
  final int? currentSupply;
  final int? lowSupplyThreshold;
  final double? costPerUnit;
  final String? currency;
  final DateTime createdAt;
  final DateTime updatedAt;

  MedicationModel({
    required this.id,
    required this.userId,
    required this.name,
    this.genericName,
    required this.dosage,
    required this.form,
    this.instructions,
    this.isCritical = false,
    this.isActive = true,
    this.currentSupply,
    this.lowSupplyThreshold,
    this.costPerUnit,
    this.currency,
    required this.createdAt,
    required this.updatedAt,
  });

  factory MedicationModel.fromJson(Map<String, dynamic> json) {
    return MedicationModel(
      id: json['id'] as String,
      userId: json['userId'] as String,
      name: json['name'] as String,
      genericName: json['genericName'] as String?,
      dosage: json['dosage'] as String,
      form: json['form'] as String,
      instructions: json['instructions'] as String?,
      isCritical: json['isCritical'] as bool? ?? false,
      isActive: json['isActive'] as bool? ?? true,
      currentSupply: json['currentSupply'] as int?,
      lowSupplyThreshold: json['lowSupplyThreshold'] as int?,
      costPerUnit: (json['costPerUnit'] as num?)?.toDouble(),
      currency: json['currency'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'name': name,
      'genericName': genericName,
      'dosage': dosage,
      'form': form,
      'instructions': instructions,
      'isCritical': isCritical,
      'isActive': isActive,
      'currentSupply': currentSupply,
      'lowSupplyThreshold': lowSupplyThreshold,
      'costPerUnit': costPerUnit,
      'currency': currency,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  MedicationModel copyWith({
    String? id,
    String? userId,
    String? name,
    String? genericName,
    String? dosage,
    String? form,
    String? instructions,
    bool? isCritical,
    bool? isActive,
    int? currentSupply,
    int? lowSupplyThreshold,
    double? costPerUnit,
    String? currency,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return MedicationModel(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      name: name ?? this.name,
      genericName: genericName ?? this.genericName,
      dosage: dosage ?? this.dosage,
      form: form ?? this.form,
      instructions: instructions ?? this.instructions,
      isCritical: isCritical ?? this.isCritical,
      isActive: isActive ?? this.isActive,
      currentSupply: currentSupply ?? this.currentSupply,
      lowSupplyThreshold: lowSupplyThreshold ?? this.lowSupplyThreshold,
      costPerUnit: costPerUnit ?? this.costPerUnit,
      currency: currency ?? this.currency,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
