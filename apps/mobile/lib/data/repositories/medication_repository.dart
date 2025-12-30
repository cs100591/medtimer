import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../datasources/api_service.dart';
import '../models/medication_model.dart';

class MedicationRepository {
  final ApiService _api = ApiService();
  static const String _medicationsKey = 'cached_medications';

  // Get all medications - tries API first, falls back to local
  Future<List<MedicationModel>> getMedications(String userId) async {
    try {
      // Try to fetch from API
      final apiMedications = await _api.getMedications();
      final medications = apiMedications
          .map((json) => MedicationModel.fromJson(json as Map<String, dynamic>))
          .toList();
      
      // Cache locally
      await _cacheLocally(medications);
      
      return medications;
    } catch (e) {
      // Fallback to local storage
      print('API error, using local cache: $e');
      return _getLocalMedications(userId);
    }
  }

  Future<List<MedicationModel>> _getLocalMedications(String userId) async {
    final prefs = await SharedPreferences.getInstance();
    final medsJson = prefs.getString(_medicationsKey);
    if (medsJson == null) return [];
    
    try {
      final List<dynamic> medsList = jsonDecode(medsJson);
      return medsList
          .map((json) => MedicationModel.fromJson(json as Map<String, dynamic>))
          .where((m) => m.userId == userId && m.isActive)
          .toList();
    } catch (e) {
      return [];
    }
  }

  Future<void> _cacheLocally(List<MedicationModel> medications) async {
    final prefs = await SharedPreferences.getInstance();
    final medsJson = jsonEncode(medications.map((m) => m.toJson()).toList());
    await prefs.setString(_medicationsKey, medsJson);
  }

  // Get a single medication by ID
  Future<MedicationModel?> getMedicationById(String id) async {
    try {
      final json = await _api.getMedication(id);
      return MedicationModel.fromJson(json);
    } catch (e) {
      // Fallback to local
      final prefs = await SharedPreferences.getInstance();
      final medsJson = prefs.getString(_medicationsKey);
      if (medsJson == null) return null;
      
      final List<dynamic> medsList = jsonDecode(medsJson);
      final found = medsList.firstWhere(
        (m) => m['id'] == id,
        orElse: () => null,
      );
      return found != null ? MedicationModel.fromJson(found) : null;
    }
  }

  // Create a new medication
  Future<MedicationModel> createMedication(MedicationModel medication) async {
    try {
      // Create on API
      final json = await _api.createMedication(medication.toJson());
      final data = json['data'] ?? json;
      final created = MedicationModel.fromJson(data);
      
      // Update local cache
      await _addToLocalCache(created);
      
      return created;
    } catch (e) {
      // Save locally
      await _addToLocalCache(medication);
      return medication;
    }
  }

  Future<void> _addToLocalCache(MedicationModel medication) async {
    final prefs = await SharedPreferences.getInstance();
    final medsJson = prefs.getString(_medicationsKey) ?? '[]';
    final List<dynamic> medsList = jsonDecode(medsJson);
    
    // Remove existing if any
    medsList.removeWhere((m) => m['id'] == medication.id);
    medsList.add(medication.toJson());
    
    await prefs.setString(_medicationsKey, jsonEncode(medsList));
  }

  // Update a medication
  Future<MedicationModel> updateMedication(MedicationModel medication) async {
    try {
      final json = await _api.updateMedication(medication.id, medication.toJson());
      final data = json['data'] ?? json;
      final updated = MedicationModel.fromJson(data);
      
      // Update local cache
      await _addToLocalCache(updated);
      
      return updated;
    } catch (e) {
      // Update locally
      await _addToLocalCache(medication);
      return medication;
    }
  }

  // Delete a medication
  Future<void> deleteMedication(String id) async {
    try {
      await _api.deleteMedication(id);
    } catch (e) {
      print('API delete error: $e');
    }
    
    // Always update local
    final prefs = await SharedPreferences.getInstance();
    final medsJson = prefs.getString(_medicationsKey) ?? '[]';
    final List<dynamic> medsList = jsonDecode(medsJson);
    medsList.removeWhere((m) => m['id'] == id);
    await prefs.setString(_medicationsKey, jsonEncode(medsList));
  }

  // Search medications by name
  Future<List<MedicationModel>> searchMedications(String userId, String query) async {
    final all = await getMedications(userId);
    final lowerQuery = query.toLowerCase();
    return all.where((m) => 
      m.name.toLowerCase().contains(lowerQuery) ||
      (m.genericName?.toLowerCase().contains(lowerQuery) ?? false)
    ).toList();
  }

  // Get critical medications
  Future<List<MedicationModel>> getCriticalMedications(String userId) async {
    final all = await getMedications(userId);
    return all.where((m) => m.isCritical).toList();
  }

  // Update supply count
  Future<void> updateSupply(String id, int newSupply) async {
    try {
      await _api.updateSupply(id, newSupply);
    } catch (e) {
      print('API update supply error: $e');
    }
    
    // Update local
    final med = await getMedicationById(id);
    if (med != null) {
      final updated = med.copyWith(
        currentSupply: newSupply,
        updatedAt: DateTime.now(),
      );
      await _addToLocalCache(updated);
    }
  }

  // Get low supply medications
  Future<List<MedicationModel>> getLowSupplyMedications(String userId) async {
    try {
      final apiMeds = await _api.getLowSupplyMedications();
      return apiMeds.map((json) => MedicationModel.fromJson(json as Map<String, dynamic>)).toList();
    } catch (e) {
      final all = await getMedications(userId);
      return all.where((m) => 
        m.currentSupply != null && 
        m.lowSupplyThreshold != null && 
        m.currentSupply! <= m.lowSupplyThreshold!
      ).toList();
    }
  }
}
