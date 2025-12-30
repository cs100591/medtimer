import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/adherence_model.dart';
import '../../data/repositories/adherence_repository.dart';

// Repository provider
final adherenceRepositoryProvider = Provider((ref) => AdherenceRepository());

// Today's adherence provider
final todayAdherenceProvider = FutureProvider.family<List<AdherenceModel>, String>(
  (ref, userId) async {
    final repo = ref.watch(adherenceRepositoryProvider);
    return repo.getTodayAdherence(userId);
  },
);

// Adherence rate provider
final adherenceRateProvider = FutureProvider.family<double, AdherenceRateParams>(
  (ref, params) async {
    final repo = ref.watch(adherenceRepositoryProvider);
    return repo.calculateAdherenceRate(
      params.medicationId,
      params.startDate,
      params.endDate,
    );
  },
);

class AdherenceRateParams {
  final String medicationId;
  final DateTime startDate;
  final DateTime endDate;

  AdherenceRateParams({
    required this.medicationId,
    required this.startDate,
    required this.endDate,
  });

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is AdherenceRateParams &&
          medicationId == other.medicationId &&
          startDate == other.startDate &&
          endDate == other.endDate;

  @override
  int get hashCode => Object.hash(medicationId, startDate, endDate);
}

// Adherence notifier for logging
class AdherenceNotifier extends StateNotifier<AsyncValue<void>> {
  final AdherenceRepository _repository;

  AdherenceNotifier(this._repository) : super(const AsyncValue.data(null));

  Future<void> logTaken(AdherenceModel record) async {
    state = const AsyncValue.loading();
    try {
      final takenRecord = AdherenceModel(
        id: record.id,
        medicationId: record.medicationId,
        scheduleId: record.scheduleId,
        scheduledTime: record.scheduledTime,
        actualTime: DateTime.now(),
        status: AdherenceStatus.taken,
        notes: record.notes,
        createdAt: DateTime.now(),
      );
      await _repository.logAdherence(takenRecord);
      state = const AsyncValue.data(null);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> logSkipped(AdherenceModel record, {String? reason}) async {
    state = const AsyncValue.loading();
    try {
      final skippedRecord = AdherenceModel(
        id: record.id,
        medicationId: record.medicationId,
        scheduleId: record.scheduleId,
        scheduledTime: record.scheduledTime,
        actualTime: null,
        status: AdherenceStatus.skipped,
        notes: reason,
        createdAt: DateTime.now(),
      );
      await _repository.logAdherence(skippedRecord);
      state = const AsyncValue.data(null);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> logSnoozed(AdherenceModel record, Duration snoozeTime) async {
    state = const AsyncValue.loading();
    try {
      final snoozedRecord = AdherenceModel(
        id: record.id,
        medicationId: record.medicationId,
        scheduleId: record.scheduleId,
        scheduledTime: record.scheduledTime.add(snoozeTime),
        actualTime: null,
        status: AdherenceStatus.snoozed,
        notes: 'Snoozed for ${snoozeTime.inMinutes} minutes',
        createdAt: DateTime.now(),
      );
      await _repository.logAdherence(snoozedRecord);
      state = const AsyncValue.data(null);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }
}

final adherenceNotifierProvider = StateNotifierProvider<AdherenceNotifier, AsyncValue<void>>(
  (ref) {
    final repo = ref.watch(adherenceRepositoryProvider);
    return AdherenceNotifier(repo);
  },
);
