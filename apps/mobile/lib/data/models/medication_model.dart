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
  final int frequency; // times per day (1, 2, 3, 4)
  final String firstDoseTime; // HH:mm format
  final List<String> scheduleTimes; // calculated times
  final int durationDays; // 0 = ongoing, 1-99 = fixed days
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
    this.frequency = 1,
    this.firstDoseTime = '08:00',
    this.scheduleTimes = const ['8:00 AM'],
    this.durationDays = 0, // 0 = ongoing
    required this.createdAt,
    required this.updatedAt,
  });

  // Check if medication is ongoing (no end date)
  bool get isOngoing => durationDays == 0;
  
  // Get duration display string
  String get durationDisplay => durationDays == 0 ? 'Ongoing' : '$durationDays days';

  // Calculate schedule times based on frequency, first dose, and mode
  // mode: '24h' = full day, '12h' = waking hours only (8AM-8PM)
  static List<String> calculateScheduleTimes(String firstTime, int frequency, {String mode = '24h'}) {
    if (frequency <= 1) return [_formatTime(firstTime)];
    
    final parts = firstTime.split(':');
    final firstHours = int.parse(parts[0]);
    final minutes = int.parse(parts[1]);
    
    final times = <String>[];
    
    if (mode == '12h') {
      // For 12h mode, spread doses evenly over 12 hours starting from first dose
      final intervalHours = 12 ~/ frequency;
      
      for (var i = 0; i < frequency; i++) {
        var hour = (firstHours + (intervalHours * i)) % 24;
        times.add(_formatTimeFromHourMinute(hour, minutes));
      }
    } else {
      // 24h mode - spread evenly over 24 hours
      final intervalHours = 24 ~/ frequency;
      
      for (var i = 0; i < frequency; i++) {
        var hour = (firstHours + (intervalHours * i)) % 24;
        times.add(_formatTimeFromHourMinute(hour, minutes));
      }
    }
    
    return times;
  }
  
  static String _formatTimeFromHourMinute(int hours, int minutes) {
    final period = hours >= 12 ? 'PM' : 'AM';
    final displayHours = hours > 12 ? hours - 12 : (hours == 0 ? 12 : hours);
    return '$displayHours:${minutes.toString().padLeft(2, '0')} $period';
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
      currentSupply: json['currentSupply'] as int?,
      lowSupplyThreshold: json['lowSupplyThreshold'] as int?,
      costPerUnit: (json['costPerUnit'] as num?)?.toDouble(),
      currency: json['currency'] as String?,
      frequency: frequency,
      firstDoseTime: firstDoseTime,
      scheduleTimes: scheduleTimes,
      durationDays: json['durationDays'] as int? ?? 0,
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
      'frequency': frequency,
      'firstDoseTime': firstDoseTime,
      'scheduleTimes': scheduleTimes,
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
    int? currentSupply,
    int? lowSupplyThreshold,
    double? costPerUnit,
    String? currency,
    int? frequency,
    String? firstDoseTime,
    List<String>? scheduleTimes,
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
      currentSupply: currentSupply ?? this.currentSupply,
      lowSupplyThreshold: lowSupplyThreshold ?? this.lowSupplyThreshold,
      costPerUnit: costPerUnit ?? this.costPerUnit,
      currency: currency ?? this.currency,
      frequency: frequency ?? this.frequency,
      firstDoseTime: firstDoseTime ?? this.firstDoseTime,
      scheduleTimes: scheduleTimes ?? this.scheduleTimes,
      durationDays: durationDays ?? this.durationDays,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
