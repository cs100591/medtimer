import 'dart:convert';
import '../datasources/local_database.dart';
import '../models/adherence_model.dart';

class AdherenceRepository {
  // Log adherence record
  Future<AdherenceModel> logAdherence(AdherenceModel record) async {
    final db = await LocalDatabase.database;
    await db.insert('adherence_records', _toRow(record));
    
    await _addToSyncQueue('adherence_records', record.id, 'create', record.toJson());
    
    return record;
  }

  // Get adherence records for a medication
  Future<List<AdherenceModel>> getAdherenceForMedication(
    String medicationId, {
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    final db = await LocalDatabase.database;
    
    String where = 'medication_id = ?';
    List<dynamic> whereArgs = [medicationId];
    
    if (startDate != null) {
      where += ' AND scheduled_time >= ?';
      whereArgs.add(startDate.toIso8601String());
    }
    if (endDate != null) {
      where += ' AND scheduled_time <= ?';
      whereArgs.add(endDate.toIso8601String());
    }
    
    final results = await db.query(
      'adherence_records',
      where: where,
      whereArgs: whereArgs,
      orderBy: 'scheduled_time DESC',
    );

    return results.map((row) => _fromRow(row)).toList();
  }

  // Get today's adherence records for a user
  Future<List<AdherenceModel>> getTodayAdherence(String userId) async {
    final db = await LocalDatabase.database;
    final today = DateTime.now();
    final startOfDay = DateTime(today.year, today.month, today.day);
    final endOfDay = startOfDay.add(const Duration(days: 1));
    
    final results = await db.rawQuery('''
      SELECT ar.* FROM adherence_records ar
      INNER JOIN medications m ON ar.medication_id = m.id
      WHERE m.user_id = ?
        AND ar.scheduled_time >= ?
        AND ar.scheduled_time < ?
      ORDER BY ar.scheduled_time ASC
    ''', [userId, startOfDay.toIso8601String(), endOfDay.toIso8601String()]);

    return results.map((row) => _fromRow(row)).toList();
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

  // Get pending reminders (scheduled but not logged)
  Future<List<Map<String, dynamic>>> getPendingReminders(String userId) async {
    final db = await LocalDatabase.database;
    final now = DateTime.now();
    final startOfDay = DateTime(now.year, now.month, now.day);
    
    final results = await db.rawQuery('''
      SELECT s.*, m.name as medication_name, m.dosage, m.form
      FROM schedules s
      INNER JOIN medications m ON s.medication_id = m.id
      WHERE m.user_id = ?
        AND m.is_active = 1
        AND s.is_active = 1
        AND NOT EXISTS (
          SELECT 1 FROM adherence_records ar
          WHERE ar.schedule_id = s.id
            AND ar.scheduled_time >= ?
        )
    ''', [userId, startOfDay.toIso8601String()]);

    return results;
  }

  // Update adherence record
  Future<void> updateAdherence(String id, AdherenceStatus status, {String? notes}) async {
    final db = await LocalDatabase.database;
    final updates = <String, dynamic>{
      'status': status.name,
      'actual_time': status == AdherenceStatus.taken ? DateTime.now().toIso8601String() : null,
    };
    if (notes != null) updates['notes'] = notes;
    
    await db.update(
      'adherence_records',
      updates,
      where: 'id = ?',
      whereArgs: [id],
    );
    
    await _addToSyncQueue('adherence_records', id, 'update', {
      'id': id,
      'status': status.name,
      'notes': notes,
    });
  }

  AdherenceModel _fromRow(Map<String, dynamic> row) {
    return AdherenceModel(
      id: row['id'] as String,
      medicationId: row['medication_id'] as String,
      scheduleId: row['schedule_id'] as String,
      scheduledTime: DateTime.parse(row['scheduled_time'] as String),
      actualTime: row['actual_time'] != null
          ? DateTime.parse(row['actual_time'] as String)
          : null,
      status: AdherenceStatus.values.firstWhere(
        (e) => e.name == row['status'],
        orElse: () => AdherenceStatus.missed,
      ),
      notes: row['notes'] as String?,
      createdAt: DateTime.parse(row['created_at'] as String),
    );
  }

  Map<String, dynamic> _toRow(AdherenceModel r) {
    return {
      'id': r.id,
      'medication_id': r.medicationId,
      'schedule_id': r.scheduleId,
      'scheduled_time': r.scheduledTime.toIso8601String(),
      'actual_time': r.actualTime?.toIso8601String(),
      'status': r.status.name,
      'notes': r.notes,
      'created_at': r.createdAt.toIso8601String(),
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
