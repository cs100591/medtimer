import 'dart:convert';
import 'package:sqflite/sqflite.dart';
import '../datasources/local_database.dart';
import '../datasources/api_service.dart';
import '../models/medication_model.dart';

class MedicationRepository {
  final ApiService _api = ApiService();

  // Get all medications - tries API first, falls back to local
  Future<List<MedicationModel>> getMedications(String userId) async {
    try {
      // Try to fetch from API
      final apiMedications = await _api.getMedications();
      final medications = apiMedications
          .map((json) => MedicationModel.fromJson(json))
          .toList();
      
      // Cache locally
      await _cacheLocally(medications);
      
      return medications;
    } catch (e) {
      // Fallback to local database
      print('API error, using local cache: $e');
      return _getLocalMedications(userId);
    }
  }

  Future<List<MedicationModel>> _getLocalMedications(String userId) async {
    final db = await LocalDatabase.database;
    final results = await db.query(
      'medications',
      where: 'user_id = ? AND is_active = 1',
      whereArgs: [userId],
      orderBy: 'name ASC',
    );
    return results.map((row) => _fromRow(row)).toList();
  }

  Future<void> _cacheLocally(List<MedicationModel> medications) async {
    final db = await LocalDatabase.database;
    for (final med in medications) {
      await db.insert(
        'medications',
        _toRow(med),
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
    }
  }

  // Get a single medication by ID
  Future<MedicationModel?> getMedicationById(String id) async {
    try {
      final json = await _api.getMedication(id);
      return MedicationModel.fromJson(json);
    } catch (e) {
      // Fallback to local
      final db = await LocalDatabase.database;
      final results = await db.query(
        'medications',
        where: 'id = ?',
        whereArgs: [id],
        limit: 1,
      );
      if (results.isEmpty) return null;
      return _fromRow(results.first);
    }
  }

  // Create a new medication
  Future<MedicationModel> createMedication(MedicationModel medication) async {
    try {
      // Create on API
      final json = await _api.createMedication(medication.toJson());
      final created = MedicationModel.fromJson(json);
      
      // Cache locally
      final db = await LocalDatabase.database;
      await db.insert('medications', _toRow(created));
      
      return created;
    } catch (e) {
      // Save locally and queue for sync
      final db = await LocalDatabase.database;
      await db.insert('medications', _toRow(medication));
      await _addToSyncQueue('medications', medication.id, 'create', medication.toJson());
      return medication;
    }
  }

  // Update a medication
  Future<MedicationModel> updateMedication(MedicationModel medication) async {
    try {
      final json = await _api.updateMedication(medication.id, medication.toJson());
      final updated = MedicationModel.fromJson(json);
      
      // Update local cache
      final db = await LocalDatabase.database;
      await db.update(
        'medications',
        _toRow(updated),
        where: 'id = ?',
        whereArgs: [updated.id],
      );
      
      return updated;
    } catch (e) {
      // Update locally and queue for sync
      final db = await LocalDatabase.database;
      await db.update(
        'medications',
        _toRow(medication),
        where: 'id = ?',
        whereArgs: [medication.id],
      );
      await _addToSyncQueue('medications', medication.id, 'update', medication.toJson());
      return medication;
    }
  }

  // Delete a medication
  Future<void> deleteMedication(String id) async {
    try {
      await _api.deleteMedication(id);
    } catch (e) {
      await _addToSyncQueue('medications', id, 'delete', {'id': id});
    }
    
    // Always update local
    final db = await LocalDatabase.database;
    await db.update(
      'medications',
      {'is_active': 0, 'updated_at': DateTime.now().toIso8601String()},
      where: 'id = ?',
      whereArgs: [id],
    );
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
      await _addToSyncQueue('medications', id, 'update', {
        'id': id,
        'currentSupply': newSupply,
      });
    }
    
    final db = await LocalDatabase.database;
    await db.update(
      'medications',
      {
        'current_supply': newSupply,
        'updated_at': DateTime.now().toIso8601String(),
      },
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  // Get low supply medications
  Future<List<MedicationModel>> getLowSupplyMedications(String userId) async {
    try {
      final apiMeds = await _api.getLowSupplyMedications();
      return apiMeds.map((json) => MedicationModel.fromJson(json)).toList();
    } catch (e) {
      final all = await getMedications(userId);
      return all.where((m) => 
        m.currentSupply != null && 
        m.lowSupplyThreshold != null && 
        m.currentSupply! <= m.lowSupplyThreshold!
      ).toList();
    }
  }

  MedicationModel _fromRow(Map<String, dynamic> row) {
    return MedicationModel(
      id: row['id'] as String,
      userId: row['user_id'] as String,
      name: row['name'] as String,
      genericName: row['generic_name'] as String?,
      dosage: row['dosage'] as String,
      form: row['form'] as String,
      instructions: row['instructions'] as String?,
      isCritical: (row['is_critical'] as int?) == 1,
      isActive: (row['is_active'] as int?) == 1,
      currentSupply: row['current_supply'] as int?,
      lowSupplyThreshold: row['low_supply_threshold'] as int?,
      costPerUnit: row['cost_per_unit'] as double?,
      currency: row['currency'] as String?,
      createdAt: DateTime.parse(row['created_at'] as String),
      updatedAt: DateTime.parse(row['updated_at'] as String),
    );
  }

  Map<String, dynamic> _toRow(MedicationModel m) {
    return {
      'id': m.id,
      'user_id': m.userId,
      'name': m.name,
      'generic_name': m.genericName,
      'dosage': m.dosage,
      'form': m.form,
      'instructions': m.instructions,
      'is_critical': m.isCritical ? 1 : 0,
      'is_active': m.isActive ? 1 : 0,
      'current_supply': m.currentSupply,
      'low_supply_threshold': m.lowSupplyThreshold,
      'cost_per_unit': m.costPerUnit,
      'currency': m.currency,
      'created_at': m.createdAt.toIso8601String(),
      'updated_at': m.updatedAt.toIso8601String(),
    };
  }

  Future<void> _addToSyncQueue(
    String tableName,
    String recordId,
    String operation,
    Map<String, dynamic> data,
  ) async {
    final db = await LocalDatabase.database;
    await db.insert('sync_queue', {
      'table_name': tableName,
      'record_id': recordId,
      'operation': operation,
      'data': jsonEncode(data),
      'created_at': DateTime.now().toIso8601String(),
    });
  }
}
