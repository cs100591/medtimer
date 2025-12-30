// Adherence record model
enum AdherenceStatus { taken, skipped, snoozed, missed }

class AdherenceModel {
  final String id;
  final String medicationId;
  final String scheduleId;
  final DateTime scheduledTime;
  final DateTime? actualTime;
  final AdherenceStatus status;
  final String? notes;
  final DateTime createdAt;

  AdherenceModel({
    required this.id,
    required this.medicationId,
    required this.scheduleId,
    required this.scheduledTime,
    this.actualTime,
    required this.status,
    this.notes,
    required this.createdAt,
  });

  factory AdherenceModel.fromJson(Map<String, dynamic> json) {
    return AdherenceModel(
      id: json['id'] as String,
      medicationId: json['medicationId'] as String,
      scheduleId: json['scheduleId'] as String,
      scheduledTime: DateTime.parse(json['scheduledTime'] as String),
      actualTime: json['actualTime'] != null
          ? DateTime.parse(json['actualTime'] as String)
          : null,
      status: AdherenceStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => AdherenceStatus.missed,
      ),
      notes: json['notes'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'medicationId': medicationId,
      'scheduleId': scheduleId,
      'scheduledTime': scheduledTime.toIso8601String(),
      'actualTime': actualTime?.toIso8601String(),
      'status': status.name,
      'notes': notes,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}
