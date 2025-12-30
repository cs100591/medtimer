// Schedule data model
enum FrequencyType { daily, weekly, monthly, asNeeded, custom }
enum DurationType { ongoing, fixedDays, untilDate, cycles }

class ScheduleModel {
  final String id;
  final String medicationId;
  final FrequencyType frequencyType;
  final List<String> times; // HH:mm format
  final List<int>? daysOfWeek; // 0-6 for weekly
  final int? intervalDays; // for custom frequency
  final DurationType durationType;
  final DateTime? endDate;
  final int? totalDays;
  final int? cycleDaysOn;
  final int? cycleDaysOff;
  final bool isActive;
  final DateTime createdAt;

  ScheduleModel({
    required this.id,
    required this.medicationId,
    required this.frequencyType,
    required this.times,
    this.daysOfWeek,
    this.intervalDays,
    required this.durationType,
    this.endDate,
    this.totalDays,
    this.cycleDaysOn,
    this.cycleDaysOff,
    this.isActive = true,
    required this.createdAt,
  });

  factory ScheduleModel.fromJson(Map<String, dynamic> json) {
    return ScheduleModel(
      id: json['id'] as String,
      medicationId: json['medicationId'] as String,
      frequencyType: FrequencyType.values.firstWhere(
        (e) => e.name == json['frequencyType'],
        orElse: () => FrequencyType.daily,
      ),
      times: List<String>.from(json['times'] as List),
      daysOfWeek: json['daysOfWeek'] != null
          ? List<int>.from(json['daysOfWeek'] as List)
          : null,
      intervalDays: json['intervalDays'] as int?,
      durationType: DurationType.values.firstWhere(
        (e) => e.name == json['durationType'],
        orElse: () => DurationType.ongoing,
      ),
      endDate: json['endDate'] != null
          ? DateTime.parse(json['endDate'] as String)
          : null,
      totalDays: json['totalDays'] as int?,
      cycleDaysOn: json['cycleDaysOn'] as int?,
      cycleDaysOff: json['cycleDaysOff'] as int?,
      isActive: json['isActive'] as bool? ?? true,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'medicationId': medicationId,
      'frequencyType': frequencyType.name,
      'times': times,
      'daysOfWeek': daysOfWeek,
      'intervalDays': intervalDays,
      'durationType': durationType.name,
      'endDate': endDate?.toIso8601String(),
      'totalDays': totalDays,
      'cycleDaysOn': cycleDaysOn,
      'cycleDaysOff': cycleDaysOff,
      'isActive': isActive,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}
