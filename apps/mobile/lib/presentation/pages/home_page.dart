import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import '../../data/models/medication_model.dart';
import '../providers/auth_provider.dart';
import '../providers/medication_provider.dart';
import 'medications_page.dart';
import 'adherence_page.dart';
import 'caregiver_page.dart';
import 'settings_page.dart';

class HomePage extends ConsumerStatefulWidget {
  const HomePage({super.key});

  @override
  ConsumerState<HomePage> createState() => _HomePageState();
}

class _HomePageState extends ConsumerState<HomePage> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    final pages = [
      const _TodayTab(),
      const MedicationsPage(),
      const AdherencePage(),
      const CaregiverPage(),
      const SettingsPage(),
    ];

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: pages,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (index) => setState(() => _currentIndex = index),
        backgroundColor: Colors.white,
        indicatorColor: const Color(0xFF007AFF).withOpacity(0.1),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.today_outlined),
            selectedIcon: Icon(Icons.today, color: Color(0xFF007AFF)),
            label: 'Today',
          ),
          NavigationDestination(
            icon: Icon(Icons.medication_outlined),
            selectedIcon: Icon(Icons.medication, color: Color(0xFF007AFF)),
            label: 'Meds',
          ),
          NavigationDestination(
            icon: Icon(Icons.bar_chart_outlined),
            selectedIcon: Icon(Icons.bar_chart, color: Color(0xFF007AFF)),
            label: 'Adherence',
          ),
          NavigationDestination(
            icon: Icon(Icons.people_outline),
            selectedIcon: Icon(Icons.people, color: Color(0xFF007AFF)),
            label: 'Caregiver',
          ),
          NavigationDestination(
            icon: Icon(Icons.settings_outlined),
            selectedIcon: Icon(Icons.settings, color: Color(0xFF007AFF)),
            label: 'Settings',
          ),
        ],
      ),
    );
  }
}

class _TodayTab extends ConsumerStatefulWidget {
  const _TodayTab();

  @override
  ConsumerState<_TodayTab> createState() => _TodayTabState();
}

class _TodayTabState extends ConsumerState<_TodayTab> {
  final Set<String> _expandedGroups = {};
  Map<String, String> _reminderStatuses = {}; // id -> 'pending' | 'completed' | 'missed'
  String? _snoozeId;

  @override
  void initState() {
    super.initState();
    _loadReminderStatuses();
  }

  Future<void> _loadReminderStatuses() async {
    final prefs = await SharedPreferences.getInstance();
    final statusesJson = prefs.getString('reminder_statuses');
    if (statusesJson != null) {
      setState(() {
        _reminderStatuses = Map<String, String>.from(jsonDecode(statusesJson));
      });
    }
  }

  Future<void> _saveReminderStatuses() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('reminder_statuses', jsonEncode(_reminderStatuses));
  }

  void _toggleGroup(String time) {
    setState(() {
      if (_expandedGroups.contains(time)) {
        _expandedGroups.remove(time);
      } else {
        _expandedGroups.add(time);
      }
    });
  }

  void _handleTake(String id, String medicationName) {
    setState(() {
      _reminderStatuses[id] = 'completed';
    });
    _saveReminderStatuses();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('✓ $medicationName marked as taken'),
        backgroundColor: const Color(0xFF32D74B),
      ),
    );
  }

  void _handleSkip(String id, String medicationName) {
    setState(() {
      _reminderStatuses[id] = 'missed';
    });
    _saveReminderStatuses();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('$medicationName skipped')),
    );
  }

  void _handleSnooze(String id, String medicationName) {
    setState(() => _snoozeId = id);
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) setState(() => _snoozeId = null);
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('😴 Snoozed for 15 minutes'),
        backgroundColor: Color(0xFFFF9500),
      ),
    );
  }

  void _resetReminders() {
    setState(() {
      _reminderStatuses.clear();
    });
    _saveReminderStatuses();
  }

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final userId = ref.watch(currentUserIdProvider);
    final user = ref.watch(currentUserProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF2F2F7),
      body: SafeArea(
        child: userId == null
            ? const Center(child: CircularProgressIndicator())
            : _buildBody(context, userId, user?.fullName ?? 'there', now),
      ),
    );
  }

  Widget _buildBody(BuildContext context, String userId, String userName, DateTime now) {
    final medicationsAsync = ref.watch(medicationsProvider(userId));

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(medicationsProvider(userId));
        await _loadReminderStatuses();
      },
      child: medicationsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => _buildErrorState(context, userId, error),
        data: (medications) => _buildContent(context, medications, userName, now),
      ),
    );
  }

  Widget _buildErrorState(BuildContext context, String userId, Object error) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 48, color: Colors.red),
          const SizedBox(height: 16),
          Text('Error: $error'),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () => ref.invalidate(medicationsProvider(userId)),
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  Widget _buildContent(BuildContext context, List<MedicationModel> medications, String userName, DateTime now) {
    // Generate reminders from medications
    final reminders = <Map<String, dynamic>>[];
    for (final med in medications) {
      if (!med.isActive) continue;
      for (var i = 0; i < med.scheduleTimes.length; i++) {
        final id = '${med.id}-$i';
        reminders.add({
          'id': id,
          'medication': med,
          'time': med.scheduleTimes[i],
          'status': _reminderStatuses[id] ?? 'pending',
        });
      }
    }

    // Group by time
    final groupedReminders = <String, List<Map<String, dynamic>>>{};
    for (final reminder in reminders) {
      final time = reminder['time'] as String;
      groupedReminders.putIfAbsent(time, () => []);
      groupedReminders[time]!.add(reminder);
    }

    // Sort groups by time
    final sortedTimes = groupedReminders.keys.toList()
      ..sort((a, b) => _parseTime(a).compareTo(_parseTime(b)));

    // Calculate progress
    final total = reminders.length;
    final completed = reminders.where((r) => r['status'] == 'completed').length;
    final progress = total > 0 ? (completed / total * 100).round() : 0;

    // Separate pending and completed
    final pendingGroups = <String, List<Map<String, dynamic>>>{};
    final completedGroups = <String, List<Map<String, dynamic>>>{};
    
    for (final time in sortedTimes) {
      final pending = groupedReminders[time]!.where((r) => r['status'] == 'pending').toList();
      final done = groupedReminders[time]!.where((r) => r['status'] == 'completed').toList();
      if (pending.isNotEmpty) pendingGroups[time] = pending;
      if (done.isNotEmpty) completedGroups[time] = done;
    }

    final dateStr = _formatDate(now);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Header
        Text(
          dateStr,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: Color(0xFF007AFF),
          ),
        ),
        const SizedBox(height: 4),
        const Text(
          "Today's Reminders",
          style: TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.bold,
            color: Color(0xFF1C1C1E),
          ),
        ),
        const SizedBox(height: 20),

        // Progress Card
        _buildProgressCard(completed, total, progress),
        const SizedBox(height: 20),

        // Snooze Toast
        if (_snoozeId != null)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            margin: const EdgeInsets.only(bottom: 16),
            decoration: BoxDecoration(
              color: const Color(0xFFFF9500),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text('😴', style: TextStyle(fontSize: 20)),
                SizedBox(width: 8),
                Text('Snoozed', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
              ],
            ),
          ),

        // Empty State
        if (total == 0)
          _buildEmptyState(),

        // Pending Reminders
        if (pendingGroups.isNotEmpty) ...[
          Row(
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: const BoxDecoration(
                  color: Color(0xFF007AFF),
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 8),
              const Text(
                'Upcoming',
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF1C1C1E),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...pendingGroups.entries.map((entry) => _buildTimeGroupCard(
            entry.key,
            entry.value,
            isPending: true,
          )),
          const SizedBox(height: 20),
        ],

        // Completed Reminders
        if (completedGroups.isNotEmpty) ...[
          const Row(
            children: [
              Text('✓', style: TextStyle(color: Color(0xFF32D74B), fontSize: 16)),
              SizedBox(width: 8),
              Text(
                'Completed',
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF32D74B),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Opacity(
            opacity: 0.7,
            child: Column(
              children: completedGroups.entries.map((entry) => _buildTimeGroupCard(
                entry.key,
                entry.value,
                isPending: false,
              )).toList(),
            ),
          ),
        ],

        // Reset Button
        if (completed > 0) ...[
          const SizedBox(height: 20),
          Center(
            child: TextButton(
              onPressed: _resetReminders,
              child: const Text(
                'Reset Reminders',
                style: TextStyle(color: Color(0xFF8E8E93)),
              ),
            ),
          ),
        ],

        const SizedBox(height: 80),
      ],
    );
  }

  Widget _buildProgressCard(int completed, int total, int progress) {
    final progressColor = progress >= 80
        ? const Color(0xFF32D74B)
        : progress >= 50
            ? const Color(0xFFFF9500)
            : const Color(0xFF007AFF);

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  "Today's Progress",
                  style: TextStyle(
                    fontSize: 14,
                    color: Color(0xFF8E8E93),
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 8),
                RichText(
                  text: TextSpan(
                    style: const TextStyle(
                      fontSize: 40,
                      fontWeight: FontWeight.bold,
                      fontFamily: 'SF Pro Display',
                    ),
                    children: [
                      TextSpan(
                        text: '$completed',
                        style: const TextStyle(color: Color(0xFF1C1C1E)),
                      ),
                      TextSpan(
                        text: '/$total',
                        style: const TextStyle(color: Color(0xFFAEAEB2)),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'doses taken',
                  style: TextStyle(
                    fontSize: 14,
                    color: Color(0xFF8E8E93),
                  ),
                ),
                if (completed == total && total > 0) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFF32D74B).withOpacity(0.12),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text('🎉', style: TextStyle(fontSize: 14)),
                        SizedBox(width: 4),
                        Text(
                          'All done!',
                          style: TextStyle(
                            color: Color(0xFF32D74B),
                            fontWeight: FontWeight.w600,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
          SizedBox(
            width: 96,
            height: 96,
            child: Stack(
              children: [
                SizedBox.expand(
                  child: CircularProgressIndicator(
                    value: progress / 100,
                    strokeWidth: 8,
                    backgroundColor: const Color(0xFFE5E5EA),
                    valueColor: AlwaysStoppedAnimation(progressColor),
                  ),
                ),
                Center(
                  child: Text(
                    '$progress%',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: progressColor,
                      fontFamily: 'SF Pro Display',
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Container(
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: const Color(0xFF007AFF).withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: const Center(
              child: Text('💊', style: TextStyle(fontSize: 40)),
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'No medications today',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: Color(0xFF1C1C1E),
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Add medications to see reminders here',
            style: TextStyle(
              fontSize: 14,
              color: Color(0xFF8E8E93),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTimeGroupCard(String time, List<Map<String, dynamic>> reminders, {required bool isPending}) {
    final isExpanded = _expandedGroups.contains(time);
    final allCompleted = reminders.every((r) => r['status'] == 'completed');

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: isExpanded
            ? [BoxShadow(color: Colors.black.withOpacity(0.08), blurRadius: 12, offset: const Offset(0, 4))]
            : null,
      ),
      child: Column(
        children: [
          // Header
          InkWell(
            onTap: () => _toggleGroup(time),
            borderRadius: BorderRadius.circular(12),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: allCompleted
                          ? const Color(0xFF32D74B).withOpacity(0.12)
                          : const Color(0xFF007AFF).withOpacity(0.12),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Center(
                      child: Text(
                        allCompleted ? '✅' : '⏰',
                        style: const TextStyle(fontSize: 24),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          time,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF1C1C1E),
                            fontFamily: 'SF Pro Display',
                          ),
                        ),
                        Text(
                          '${reminders.length} medication${reminders.length > 1 ? 's' : ''}',
                          style: const TextStyle(
                            fontSize: 14,
                            color: Color(0xFF8E8E93),
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Avatars
                  Row(
                    children: [
                      ...reminders.take(3).map((r) {
                        final med = r['medication'] as MedicationModel;
                        final status = r['status'] as String;
                        return Container(
                          width: 32,
                          height: 32,
                          margin: const EdgeInsets.only(right: 4),
                          decoration: BoxDecoration(
                            color: status == 'completed'
                                ? const Color(0xFF32D74B)
                                : const Color(0xFF007AFF),
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 2),
                          ),
                          child: Center(
                            child: Text(
                              med.name.substring(0, 1).toUpperCase(),
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w600,
                                fontSize: 12,
                              ),
                            ),
                          ),
                        );
                      }),
                      if (reminders.length > 3)
                        Container(
                          width: 32,
                          height: 32,
                          decoration: BoxDecoration(
                            color: const Color(0xFFF2F2F7),
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 2),
                          ),
                          child: Center(
                            child: Text(
                              '+${reminders.length - 3}',
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 11,
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(width: 8),
                  Icon(
                    isExpanded ? Icons.expand_less : Icons.expand_more,
                    color: const Color(0xFFAEAEB2),
                  ),
                ],
              ),
            ),
          ),
          // Expanded content
          if (isExpanded) ...[
            const Divider(height: 1),
            Container(
              color: const Color(0xFFF2F2F7),
              padding: const EdgeInsets.all(12),
              child: Column(
                children: reminders.map((r) => _buildMedicationItem(r, isPending)).toList(),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildMedicationItem(Map<String, dynamic> reminder, bool isPending) {
    final med = reminder['medication'] as MedicationModel;
    final id = reminder['id'] as String;
    final status = reminder['status'] as String;
    final isCompleted = status == 'completed';

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: isCompleted
                      ? const Color(0xFF32D74B).withOpacity(0.12)
                      : const Color(0xFF007AFF).withOpacity(0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Center(
                  child: Text('💊', style: TextStyle(fontSize: 20)),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      med.name,
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF1C1C1E),
                      ),
                    ),
                    Text(
                      med.dosage,
                      style: const TextStyle(
                        fontSize: 14,
                        color: Color(0xFF8E8E93),
                      ),
                    ),
                  ],
                ),
              ),
              if (isCompleted)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFF32D74B).withOpacity(0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Text(
                    '✓ Taken',
                    style: TextStyle(
                      color: Color(0xFF32D74B),
                      fontWeight: FontWeight.w600,
                      fontSize: 12,
                    ),
                  ),
                ),
            ],
          ),
          if (!isCompleted && isPending) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => _handleTake(id, med.name),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF32D74B),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                      elevation: 0,
                    ),
                    child: const Text('✓ Take Dose', style: TextStyle(fontWeight: FontWeight.w600)),
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFFFF9500).withOpacity(0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: IconButton(
                    onPressed: () => _handleSnooze(id, med.name),
                    icon: const Text('😴', style: TextStyle(fontSize: 18)),
                  ),
                ),
                const SizedBox(width: 8),
                OutlinedButton(
                  onPressed: () => _handleSkip(id, med.name),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    side: const BorderSide(color: Color(0xFFE5E5EA)),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  child: const Text('Skip', style: TextStyle(color: Color(0xFF8E8E93))),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  int _parseTime(String timeStr) {
    final match = RegExp(r'(\d+):(\d+)\s*(AM|PM)?', caseSensitive: false).firstMatch(timeStr);
    if (match == null) return 0;
    var hours = int.parse(match.group(1)!);
    final minutes = int.parse(match.group(2)!);
    final period = match.group(3)?.toUpperCase();
    if (period == 'PM' && hours != 12) hours += 12;
    if (period == 'AM' && hours == 12) hours = 0;
    return hours * 60 + minutes;
  }

  String _formatDate(DateTime date) {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return '${days[date.weekday - 1]}, ${months[date.month - 1]} ${date.day}';
  }
}
