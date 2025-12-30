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
  final int frequency; // times per day (1, 2, 3, 4)
  final String firstDoseTime; // HH:mm format
  final List<String> scheduleTimes; // calculated times
  final String duration; // "ongoing" or "X days"
  final int? durationDays; // number of days if not ongoing
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
    this.frequency = 1,
    this.firstDoseTime = '08:00',
    this.scheduleTimes = const ['8:00 AM'],
    this.duration = 'ongoing',
    this.durationDays,
    required this.createdAt,
    required this.updatedAt,
  });

  // Calculate schedule times based on frequency and first dose
  static List<String> calculateScheduleTimes(String firstTime, int frequency) {
    final times = <String>[_formatTime(firstTime)];
    if (frequency <= 1) return times;
    
    final parts = firstTime.split(':');
    final hours = int.parse(parts[0]);
    final minutes = int.parse(parts[1]);
    final intervalHours = 24 ~/ frequency;
    
    for (var i = 1; i < frequency; i++) {
      var newHours = (hours + (intervalHours * i)) % 24;
      final period = newHours >= 12 ? 'PM' : 'AM';
      final displayHours = newHours > 12 ? newHours - 12 : (newHours == 0 ? 12 : newHours);
      times.add('$displayHours:${minutes.toString().padLeft(2, '0')} $period');
    }
    return times;
  }

  static String _formatTime(String time) {
    final parts = time.split(':');
    final hours = int.parse(parts[0]);
    final minutes = int.parse(parts[1]);
    final period = hours >= 12 ? 'PM' : 'AM';
    final displayHours = hours > 12 ? hours - 12 : (hours == 0 ? 12 : hours);
    return '$displayHours:${minutes.toString().padLeft(2, '0')} $period';
  }

  // Get dosage amount from dosage string
  int get dosageAmount {
    final tabletMatch = RegExp(r'(\d+)\s*tablet', caseSensitive: false).firstMatch(dosage);
    final mlMatch = RegExp(r'(\d+)\s*ml', caseSensitive: false).firstMatch(dosage);
    if (tabletMatch != null) return int.parse(tabletMatch.group(1)!);
    if (mlMatch != null) return int.parse(mlMatch.group(1)!);
    return 1;
  }

  // Check if dosage is tablet type
  bool get isTablet => dosage.toLowerCase().contains('tablet');
  
  // Check if dosage is ml type
  bool get isMl => dosage.toLowerCase().contains('ml');

  // Check if ongoing
  bool get isOngoing => duration == 'ongoing';

  factory MedicationModel.fromJson(Map<String, dynamic> json) {
    final frequency = json['frequency'] as int? ?? 1;
    final firstDoseTime = json['firstDoseTime'] as String? ?? '08:00';
    final scheduleTimes = json['scheduleTimes'] != null 
        ? List<String>.from(json['scheduleTimes'])
        : calculateScheduleTimes(firstDoseTime, frequency);

    return MedicationModel(
      id: json['id'] as String,
      userId: json['userId'] as String,
      name: json['name'] as String,
      genericName: json['genericName'] as String?,
      dosage: json['dosage'] as String,
      form: json['form'] as String? ?? 'tablet',
      instructions: json['instructions'] as String?,
      isCritical: json['isCritical'] as bool? ?? false,
      isActive: json['isActive'] as bool? ?? true,
      frequency: frequency,
      firstDoseTime: firstDoseTime,
      scheduleTimes: scheduleTimes,
      duration: json['duration'] as String? ?? 'ongoing',
      durationDays: json['durationDays'] as int?,
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
      'frequency': frequency,
      'firstDoseTime': firstDoseTime,
      'scheduleTimes': scheduleTimes,
      'duration': duration,
      'durationDays': durationDays,
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
    int? frequency,
    String? firstDoseTime,
    List<String>? scheduleTimes,
    String? duration,
    int? durationDays,
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
      frequency: frequency ?? this.frequency,
      firstDoseTime: firstDoseTime ?? this.firstDoseTime,
      scheduleTimes: scheduleTimes ?? this.scheduleTimes,
      duration: duration ?? this.duration,
      durationDays: durationDays ?? this.durationDays,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
