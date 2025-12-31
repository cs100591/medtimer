import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/medication_model.dart';
import '../providers/auth_provider.dart';
import '../providers/medication_provider.dart';
import '../widgets/reminder_card.dart';
import 'medications_page.dart';
import 'adherence_page.dart';
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
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.today_outlined),
            selectedIcon: Icon(Icons.today),
            label: 'Today',
          ),
          NavigationDestination(
            icon: Icon(Icons.medication_outlined),
            selectedIcon: Icon(Icons.medication),
            label: 'Medications',
          ),
          NavigationDestination(
            icon: Icon(Icons.bar_chart_outlined),
            selectedIcon: Icon(Icons.bar_chart),
            label: 'Adherence',
          ),
          NavigationDestination(
            icon: Icon(Icons.settings_outlined),
            selectedIcon: Icon(Icons.settings),
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

  void _toggleGroup(String time) {
    setState(() {
      if (_expandedGroups.contains(time)) {
        _expandedGroups.remove(time);
      } else {
        _expandedGroups.add(time);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final now = DateTime.now();
    final userId = ref.watch(currentUserIdProvider);
    final user = ref.watch(currentUserProvider);

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Hello, ${user?.fullName ?? 'there'}!',
              style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
            ),
            Text(
              _formatDate(now),
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.qr_code_scanner),
            onPressed: () => _openBarcodeScanner(context),
            tooltip: 'Scan medication',
          ),
          IconButton(
            icon: const Icon(Icons.emergency),
            onPressed: () => _openEmergencyScreen(context),
            tooltip: 'Emergency',
          ),
        ],
      ),
      body: userId == null
          ? const Center(child: CircularProgressIndicator())
          : _buildBody(context, userId),
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'today_fab',
        onPressed: () => _quickLogMedication(context),
        icon: const Icon(Icons.add),
        label: const Text('Quick Log'),
      ),
    );
  }

  Widget _buildBody(BuildContext context, String userId) {
    final medicationsAsync = ref.watch(medicationsProvider(userId));

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(medicationsProvider(userId));
      },
      child: medicationsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
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
        ),
        data: (medications) {
          // Generate today's reminders from medications
          final reminders = <Map<String, dynamic>>[];
          for (final med in medications) {
            for (final time in med.scheduleTimes) {
              reminders.add({
                'medication': med,
                'time': time,
                'id': '${med.id}-${med.scheduleTimes.indexOf(time)}',
              });
            }
          }
          
          // Group reminders by time
          final groupedReminders = <String, List<Map<String, dynamic>>>{};
          for (final reminder in reminders) {
            final time = reminder['time'] as String;
            groupedReminders.putIfAbsent(time, () => []);
            groupedReminders[time]!.add(reminder);
          }
          
          // Sort groups by time
          final sortedTimes = groupedReminders.keys.toList()
            ..sort((a, b) => _parseTime(a).compareTo(_parseTime(b)));
          
          return ListView(
            children: [
              _buildAdherenceSummary(context, reminders.length),
              const SizedBox(height: 8),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "Today's Reminders",
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    if (sortedTimes.isNotEmpty)
                      Text(
                        'Tap a time slot to expand',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Colors.grey,
                        ),
                      ),
                  ],
                ),
              ),
              if (reminders.isEmpty)
                const Padding(
                  padding: EdgeInsets.all(32),
                  child: Column(
                    children: [
                      Icon(Icons.medication_outlined, size: 64, color: Colors.grey),
                      SizedBox(height: 16),
                      Text(
                        'No medications scheduled',
                        style: TextStyle(fontSize: 18, color: Colors.grey),
                      ),
                      SizedBox(height: 8),
                      Text(
                        'Add medications to see reminders here',
                        style: TextStyle(color: Colors.grey),
                      ),
                    ],
                  ),
                )
              else
                ...sortedTimes.map((time) {
                  final groupReminders = groupedReminders[time]!;
                  final isExpanded = _expandedGroups.contains(time);
                  final hasCritical = groupReminders.any((r) => (r['medication'] as MedicationModel).isCritical);
                  
                  return _TimeGroupCard(
                    time: time,
                    reminders: groupReminders,
                    isExpanded: isExpanded,
                    hasCritical: hasCritical,
                    onToggle: () => _toggleGroup(time),
                    onTake: (name) => _handleTake(context, name),
                    onSkip: (name) => _handleSkip(context, name),
                    onSnooze: (name) => _handleSnooze(context, name),
                  );
                }),
              const SizedBox(height: 80),
            ],
          );
        },
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

  Widget _buildAdherenceSummary(BuildContext context, int totalMeds) {
    final theme = Theme.of(context);
    return Card(
      margin: const EdgeInsets.all(16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    "Today's Progress",
                    style: theme.textTheme.titleSmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '$totalMeds medications',
                    style: theme.textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
            SizedBox(
              width: 60,
              height: 60,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  CircularProgressIndicator(
                    value: totalMeds > 0 ? 0.0 : 1.0,
                    strokeWidth: 6,
                    backgroundColor: theme.colorScheme.surfaceContainerHighest,
                  ),
                  Center(
                    child: Text(
                      '0%',
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${days[date.weekday - 1]}, ${months[date.month - 1]} ${date.day}';
  }

  void _handleTake(BuildContext context, String medication) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('$medication marked as taken')),
    );
  }

  void _handleSkip(BuildContext context, String medication) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Skip Medication'),
        content: TextField(
          decoration: const InputDecoration(
            labelText: 'Reason (optional)',
            hintText: 'Why are you skipping this dose?',
          ),
          maxLines: 2,
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('$medication skipped')),
              );
            },
            child: const Text('Skip'),
          ),
        ],
      ),
    );
  }

  void _handleSnooze(BuildContext context, String medication) {
    showModalBottomSheet(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.snooze),
              title: const Text('Snooze for 10 minutes'),
              onTap: () {
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('$medication snoozed for 10 minutes')),
                );
              },
            ),
            ListTile(
              leading: const Icon(Icons.snooze),
              title: const Text('Snooze for 30 minutes'),
              onTap: () {
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('$medication snoozed for 30 minutes')),
                );
              },
            ),
            ListTile(
              leading: const Icon(Icons.snooze),
              title: const Text('Snooze for 1 hour'),
              onTap: () {
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('$medication snoozed for 1 hour')),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  void _openBarcodeScanner(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const BarcodeScannerPage()),
    );
  }

  void _openEmergencyScreen(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const EmergencyPage()),
    );
  }

  void _quickLogMedication(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Quick log feature')),
    );
  }
}

// Time Group Card Widget - Expandable group of medications at same time
class _TimeGroupCard extends StatelessWidget {
  final String time;
  final List<Map<String, dynamic>> reminders;
  final bool isExpanded;
  final bool hasCritical;
  final VoidCallback onToggle;
  final void Function(String) onTake;
  final void Function(String) onSkip;
  final void Function(String) onSnooze;

  const _TimeGroupCard({
    required this.time,
    required this.reminders,
    required this.isExpanded,
    required this.hasCritical,
    required this.onToggle,
    required this.onTake,
    required this.onSkip,
    required this.onSnooze,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: hasCritical 
            ? const BorderSide(color: Colors.red, width: 2)
            : BorderSide.none,
      ),
      child: Column(
        children: [
          // Header - always visible, tappable
          InkWell(
            onTap: onToggle,
            borderRadius: BorderRadius.circular(12),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  // Time icon
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.blue.shade100,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.access_time, color: Colors.blue),
                  ),
                  const SizedBox(width: 12),
                  // Time and count
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          time,
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          '${reminders.length} medication${reminders.length > 1 ? 's' : ''}',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Medication avatars preview
                  Row(
                    children: [
                      ...reminders.take(3).map((r) {
                        final med = r['medication'] as MedicationModel;
                        return Container(
                          width: 32,
                          height: 32,
                          margin: const EdgeInsets.only(right: 4),
                          decoration: BoxDecoration(
                            color: med.isCritical ? Colors.red.shade100 : Colors.blue.shade100,
                            shape: BoxShape.circle,
                          ),
                          child: Center(
                            child: Text(
                              med.name.substring(0, 1).toUpperCase(),
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: med.isCritical ? Colors.red : Colors.blue,
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
                            color: Colors.grey.shade200,
                            shape: BoxShape.circle,
                          ),
                          child: Center(
                            child: Text(
                              '+${reminders.length - 3}',
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(width: 8),
                  // Expand icon
                  Icon(
                    isExpanded ? Icons.expand_less : Icons.expand_more,
                    color: Colors.grey,
                  ),
                ],
              ),
            ),
          ),
          // Expanded content
          if (isExpanded) ...[
            const Divider(height: 1),
            Container(
              color: Colors.grey.shade50,
              child: Column(
                children: reminders.map((reminder) {
                  final med = reminder['medication'] as MedicationModel;
                  return ReminderCard(
                    medicationName: med.name,
                    dosage: med.dosage,
                    time: time,
                    isPending: true,
                    isCritical: med.isCritical,
                    onTake: () => onTake(med.name),
                    onSkip: () => onSkip(med.name),
                    onSnooze: () => onSnooze(med.name),
                  );
                }).toList(),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

// Placeholder pages
class BarcodeScannerPage extends StatelessWidget {
  const BarcodeScannerPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Scan Medication')),
      body: const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.qr_code_scanner, size: 100, color: Colors.grey),
            SizedBox(height: 16),
            Text('Point camera at medication barcode'),
          ],
        ),
      ),
    );
  }
}

class EmergencyPage extends StatelessWidget {
  const EmergencyPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Emergency'),
        backgroundColor: Colors.red,
        foregroundColor: Colors.white,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            color: Colors.red.shade50,
            child: const Padding(
              padding: EdgeInsets.all(16),
              child: Column(
                children: [
                  Icon(Icons.emergency, size: 48, color: Colors.red),
                  SizedBox(height: 8),
                  Text(
                    'Emergency Contacts',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'Critical Medications',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          const Card(
            child: ListTile(
              leading: Icon(Icons.medication, color: Colors.red),
              title: Text('Aspirin 81mg'),
              subtitle: Text('Take immediately if chest pain'),
            ),
          ),
        ],
      ),
    );
  }
}
