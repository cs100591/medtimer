import '../datasources/local_database.dart';
import '../datasources/api_service.dart';
import '../models/adherence_model.dart';

class AdherenceRepository {
  final LocalDatabase _localDb = LocalDatabase();
  final ApiService _apiService = ApiService();

  // Log adherence record
  Future<AdherenceModel> logAdherence(AdherenceModel record) async {
    // Save locally first
    await _localDb.saveAdherenceRecord(record.toJson());
    
    // Try to sync with server
    if (!_apiService.isOfflineMode) {
      try {
        await _apiService.recordAdherence(record.toJson());
      } catch (e) {
        // Will sync later
      }
    }
    
    return record;
  }

  // Get adherence records for a medication
  Future<List<AdherenceModel>> getAdherenceForMedication(
    String medicationId, {
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    // Try API first
    if (!_apiService.isOfflineMode) {
      try {
        final records = await _apiService.getAdherenceRecords(
          medicationId: medicationId,
          startDate: startDate,
          endDate: endDate,
        );
        return records.map((r) => AdherenceModel.fromJson(r as Map<String, dynamic>)).toList();
      } catch (e) {
        // Fall back to local
      }
    }
    
    // Get from local database
    final records = await _localDb.getAdherenceRecordsByMedication(medicationId);
    var filtered = records.map((r) => AdherenceModel.fromJson(r)).toList();
    
    if (startDate != null) {
      filtered = filtered.where((r) => r.scheduledTime.isAfter(startDate)).toList();
    }
    if (endDate != null) {
      filtered = filtered.where((r) => r.scheduledTime.isBefore(endDate)).toList();
    }
    
    filtered.sort((a, b) => b.scheduledTime.compareTo(a.scheduledTime));
    return filtered;
  }

  // Get today's adherence records for a user
  Future<List<AdherenceModel>> getTodayAdherence(String userId) async {
    final today = DateTime.now();
    final startOfDay = DateTime(today.year, today.month, today.day);
    final endOfDay = startOfDay.add(const Duration(days: 1));
    
    final records = await _localDb.getAdherenceRecordsByDateRange(startOfDay, endOfDay);
    final filtered = records.map((r) => AdherenceModel.fromJson(r)).toList();
    filtered.sort((a, b) => a.scheduledTime.compareTo(b.scheduledTime));
    return filtered;
  }

  // Calculate adherence rate for a period
  Future<double> calculateAdherenceRate(
    String medicationId,
    DateTime startDate,
    DateTime endDate,
  ) async {
    final records = await getAdherenceForMedication(
      medicationId,
      startDate: startDate,
      endDate: endDate,
    );
    
    if (records.isEmpty) return 0.0;
    
    final taken = records.where((r) => r.status == AdherenceStatus.taken).length;
    return taken / records.length;
  }

  // Get adherence stats
  Future<Map<String, dynamic>> getAdherenceStats({String? medicationId, int days = 30}) async {
    if (!_apiService.isOfflineMode) {
      try {
        return await _apiService.getAdherenceStats(medicationId: medicationId, days: days);
      } catch (e) {
        // Fall back to local calculation
      }
    }
    
    final endDate = DateTime.now();
    final startDate = endDate.subtract(Duration(days: days));
    final records = await _localDb.getAdherenceRecordsByDateRange(startDate, endDate);
    
    final total = records.length;
    final taken = records.where((r) => r['status'] == 'taken').length;
    
    return {
      'adherenceRate': total > 0 ? taken / total : 0.0,
      'totalDoses': total,
      'takenDoses': taken,
    };
  }

  // Update adherence record
  Future<void> updateAdherence(String id, AdherenceStatus status, {String? notes}) async {
    final records = await _localDb.getAdherenceRecords();
    final index = records.indexWhere((r) => r['id'] == id);
    
    if (index != -1) {
      records[index]['status'] = status.name;
      records[index]['notes'] = notes;
      if (status == AdherenceStatus.taken) {
        records[index]['actualTime'] = DateTime.now().toIso8601String();
      }
      await _localDb.updateAdherenceRecord(id, records[index]);
    }
    
    // Try to sync with server
    if (!_apiService.isOfflineMode) {
      try {
        await _apiService.updateAdherence(id, {
          'status': status.name,
          'notes': notes,
        });
      } catch (e) {
        // Will sync later
      }
    }
  }
}
