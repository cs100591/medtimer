import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/medication_model.dart';
import '../../data/repositories/medication_repository.dart';
import '../../services/notification_service.dart';

// Repository provider
final medicationRepositoryProvider = Provider((ref) => MedicationRepository());

// Notification service provider
final notificationServiceProvider = Provider((ref) => NotificationService());

// Medications list provider
final medicationsProvider = FutureProvider.family<List<MedicationModel>, String>(
  (ref, userId) async {
    final repo = ref.watch(medicationRepositoryProvider);
    final medications = await repo.getMedications(userId);
    
    // Schedule notifications for all active medications
    final notificationService = ref.read(notificationServiceProvider);
    for (final med in medications) {
      if (med.isActive && med.scheduleTimes.isNotEmpty) {
        await notificationService.scheduleAllRemindersForMedication(
          medicationId: med.id,
          medicationName: med.name,
          dosage: med.dosage,
          scheduleTimes: med.scheduleTimes,
        );
      }
    }
    
    return medications;
  },
);

// Single medication provider
final medicationProvider = FutureProvider.family<MedicationModel?, String>(
  (ref, medicationId) async {
    final repo = ref.watch(medicationRepositoryProvider);
    return repo.getMedicationById(medicationId);
  },
);

// Critical medications provider
final criticalMedicationsProvider = FutureProvider.family<List<MedicationModel>, String>(
  (ref, userId) async {
    final repo = ref.watch(medicationRepositoryProvider);
    return repo.getCriticalMedications(userId);
  },
);

// Medication state notifier for mutations
class MedicationNotifier extends StateNotifier<AsyncValue<List<MedicationModel>>> {
  final MedicationRepository _repository;
  final NotificationService _notificationService;
  final String _userId;

  MedicationNotifier(this._repository, this._notificationService, this._userId) : super(const AsyncValue.loading()) {
    _loadMedications();
  }

  Future<void> _loadMedications() async {
    state = const AsyncValue.loading();
    try {
      final medications = await _repository.getMedications(_userId);
      
      // Schedule notifications for all active medications
      for (final med in medications) {
        if (med.isActive && med.scheduleTimes.isNotEmpty) {
          await _notificationService.scheduleAllRemindersForMedication(
            medicationId: med.id,
            medicationName: med.name,
            dosage: med.dosage,
            scheduleTimes: med.scheduleTimes,
          );
        }
      }
      
      state = AsyncValue.data(medications);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> addMedication(MedicationModel medication) async {
    try {
      await _repository.createMedication(medication);
      
      // Schedule notifications for the new medication
      if (medication.isActive && medication.scheduleTimes.isNotEmpty) {
        await _notificationService.scheduleAllRemindersForMedication(
          medicationId: medication.id,
          medicationName: medication.name,
          dosage: medication.dosage,
          scheduleTimes: medication.scheduleTimes,
        );
      }
      
      await _loadMedications();
    } catch (e) {
      rethrow;
    }
  }

  Future<void> updateMedication(MedicationModel medication) async {
    try {
      await _repository.updateMedication(medication);
      
      // Reschedule notifications for the updated medication
      if (medication.isActive && medication.scheduleTimes.isNotEmpty) {
        await _notificationService.scheduleAllRemindersForMedication(
          medicationId: medication.id,
          medicationName: medication.name,
          dosage: medication.dosage,
          scheduleTimes: medication.scheduleTimes,
        );
      } else {
        // Cancel notifications if medication is no longer active
        final baseId = medication.id.hashCode.abs();
        for (var i = 0; i < 10; i++) {
          await _notificationService.cancelNotification(baseId + i);
        }
      }
      
      await _loadMedications();
    } catch (e) {
      rethrow;
    }
  }

  Future<void> deleteMedication(String id) async {
    try {
      // Cancel notifications for the deleted medication
      final baseId = id.hashCode.abs();
      for (var i = 0; i < 10; i++) {
        await _notificationService.cancelNotification(baseId + i);
      }
      
      await _repository.deleteMedication(id);
      await _loadMedications();
    } catch (e) {
      rethrow;
    }
  }

  Future<void> updateSupply(String id, int newSupply) async {
    try {
      await _repository.updateSupply(id, newSupply);
      await _loadMedications();
    } catch (e) {
      rethrow;
    }
  }

  Future<void> refresh() => _loadMedications();
}

// Medication notifier provider
final medicationNotifierProvider = StateNotifierProvider.family<
    MedicationNotifier, AsyncValue<List<MedicationModel>>, String>(
  (ref, userId) {
    final repo = ref.watch(medicationRepositoryProvider);
    final notificationService = ref.watch(notificationServiceProvider);
    return MedicationNotifier(repo, notificationService, userId);
  },
);
