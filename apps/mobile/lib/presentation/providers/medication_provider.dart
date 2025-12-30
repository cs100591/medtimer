import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/medication_model.dart';
import '../../data/repositories/medication_repository.dart';

// Repository provider
final medicationRepositoryProvider = Provider((ref) => MedicationRepository());

// Medications list provider
final medicationsProvider = FutureProvider.family<List<MedicationModel>, String>(
  (ref, userId) async {
    final repo = ref.watch(medicationRepositoryProvider);
    return repo.getMedications(userId);
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
  final String _userId;

  MedicationNotifier(this._repository, this._userId) : super(const AsyncValue.loading()) {
    _loadMedications();
  }

  Future<void> _loadMedications() async {
    state = const AsyncValue.loading();
    try {
      final medications = await _repository.getMedications(_userId);
      state = AsyncValue.data(medications);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> addMedication(MedicationModel medication) async {
    try {
      await _repository.createMedication(medication);
      await _loadMedications();
    } catch (e) {
      rethrow;
    }
  }

  Future<void> updateMedication(MedicationModel medication) async {
    try {
      await _repository.updateMedication(medication);
      await _loadMedications();
    } catch (e) {
      rethrow;
    }
  }

  Future<void> deleteMedication(String id) async {
    try {
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
    return MedicationNotifier(repo, userId);
  },
);
