import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

/// Local database using SharedPreferences for offline storage
class LocalDatabase {
  static final LocalDatabase _instance = LocalDatabase._internal();
  factory LocalDatabase() => _instance;
  LocalDatabase._internal();

  SharedPreferences? _prefs;

  Future<void> init() async {
    _prefs ??= await SharedPreferences.getInstance();
  }

  SharedPreferences get prefs {
    if (_prefs == null) {
      throw Exception('LocalDatabase not initialized. Call init() first.');
    }
    return _prefs!;
  }

  // Adherence Records
  static const String _adherenceKey = 'adherence_records';

  Future<List<Map<String, dynamic>>> getAdherenceRecords() async {
    await init();
    final json = prefs.getString(_adherenceKey);
    if (json == null) return [];
    final list = jsonDecode(json) as List;
    return list.cast<Map<String, dynamic>>();
  }

  Future<void> saveAdherenceRecord(Map<String, dynamic> record) async {
    await init();
    final records = await getAdherenceRecords();
    records.add(record);
    await prefs.setString(_adherenceKey, jsonEncode(records));
  }

  Future<void> updateAdherenceRecord(String id, Map<String, dynamic> record) async {
    await init();
    final records = await getAdherenceRecords();
    final index = records.indexWhere((r) => r['id'] == id);
    if (index != -1) {
      records[index] = record;
      await prefs.setString(_adherenceKey, jsonEncode(records));
    }
  }

  Future<void> deleteAdherenceRecord(String id) async {
    await init();
    final records = await getAdherenceRecords();
    records.removeWhere((r) => r['id'] == id);
    await prefs.setString(_adherenceKey, jsonEncode(records));
  }

  Future<List<Map<String, dynamic>>> getAdherenceRecordsByMedication(String medicationId) async {
    final records = await getAdherenceRecords();
    return records.where((r) => r['medicationId'] == medicationId).toList();
  }

  Future<List<Map<String, dynamic>>> getAdherenceRecordsByDateRange(
    DateTime startDate,
    DateTime endDate,
  ) async {
    final records = await getAdherenceRecords();
    return records.where((r) {
      final date = DateTime.parse(r['scheduledTime'] as String);
      return date.isAfter(startDate) && date.isBefore(endDate);
    }).toList();
  }

  // Medications (offline cache)
  static const String _medicationsKey = 'offline_medications';

  Future<List<Map<String, dynamic>>> getMedications() async {
    await init();
    final json = prefs.getString(_medicationsKey);
    if (json == null) return [];
    final list = jsonDecode(json) as List;
    return list.cast<Map<String, dynamic>>();
  }

  Future<void> saveMedications(List<Map<String, dynamic>> medications) async {
    await init();
    await prefs.setString(_medicationsKey, jsonEncode(medications));
  }

  Future<void> addMedication(Map<String, dynamic> medication) async {
    await init();
    final medications = await getMedications();
    medications.add(medication);
    await saveMedications(medications);
  }

  Future<void> updateMedication(String id, Map<String, dynamic> medication) async {
    await init();
    final medications = await getMedications();
    final index = medications.indexWhere((m) => m['id'] == id);
    if (index != -1) {
      medications[index] = medication;
      await saveMedications(medications);
    }
  }

  Future<void> deleteMedication(String id) async {
    await init();
    final medications = await getMedications();
    medications.removeWhere((m) => m['id'] == id);
    await saveMedications(medications);
  }

  // Clear all data
  Future<void> clearAll() async {
    await init();
    await prefs.remove(_adherenceKey);
    await prefs.remove(_medicationsKey);
  }
}
