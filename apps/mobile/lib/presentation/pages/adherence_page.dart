import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class AdherencePage extends ConsumerWidget {
  const AdherencePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Adherence'),
        actions: [
          IconButton(
            icon: const Icon(Icons.share),
            onPressed: () => _shareReport(context),
            tooltip: 'Share report',
          ),
          IconButton(
            icon: const Icon(Icons.download),
            onPressed: () => _exportReport(context),
            tooltip: 'Export',
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Overall adherence card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Text(
                    'Overall Adherence',
                    style: theme.textTheme.titleMedium,
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: 120,
                    height: 120,
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        CircularProgressIndicator(
                          value: 0.85,
                          strokeWidth: 12,
                          backgroundColor: theme.colorScheme.surfaceContainerHighest,
                          color: Colors.green,
                        ),
                        Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                '85%',
                                style: theme.textTheme.headlineMedium?.copyWith(
                                  fontWeight: FontWeight.bold,
                                  color: Colors.green,
                                ),
                              ),
                              Text(
                                'This week',
                                style: theme.textTheme.bodySmall,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      _buildStatItem(context, '42', 'Taken', Colors.green),
                      _buildStatItem(context, '5', 'Missed', Colors.red),
                      _buildStatItem(context, '3', 'Skipped', Colors.orange),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          // Period selector
          SegmentedButton<String>(
            segments: const [
              ButtonSegment(value: 'week', label: Text('Week')),
              ButtonSegment(value: 'month', label: Text('Month')),
              ButtonSegment(value: 'year', label: Text('Year')),
            ],
            selected: const {'week'},
            onSelectionChanged: (v) {},
          ),
          const SizedBox(height: 16),
          // Weekly chart placeholder
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Weekly Trend',
                    style: theme.textTheme.titleMedium,
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    height: 150,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        _buildDayBar(context, 'Mon', 0.9),
                        _buildDayBar(context, 'Tue', 1.0),
                        _buildDayBar(context, 'Wed', 0.8),
                        _buildDayBar(context, 'Thu', 0.7),
                        _buildDayBar(context, 'Fri', 1.0),
                        _buildDayBar(context, 'Sat', 0.6),
                        _buildDayBar(context, 'Sun', 0.85),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          // By medication
          Text(
            'By Medication',
            style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          _buildMedicationAdherence(context, 'Lisinopril', 0.95),
          _buildMedicationAdherence(context, 'Metformin', 0.82),
          _buildMedicationAdherence(context, 'Aspirin', 0.78),
        ],
      ),
    );
  }

  Widget _buildStatItem(BuildContext context, String value, String label, Color color) {
    return Column(
      children: [
        Text(
          value,
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
                color: color,
              ),
        ),
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall,
        ),
      ],
    );
  }

  Widget _buildDayBar(BuildContext context, String day, double value) {
    final theme = Theme.of(context);
    final color = value >= 0.8 ? Colors.green : (value >= 0.6 ? Colors.orange : Colors.red);

    return Column(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        Container(
          width: 30,
          height: 100 * value,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(4),
          ),
        ),
        const SizedBox(height: 4),
        Text(day, style: theme.textTheme.bodySmall),
      ],
    );
  }

  Widget _buildMedicationAdherence(BuildContext context, String name, double rate) {
    final theme = Theme.of(context);
    final color = rate >= 0.8 ? Colors.green : (rate >= 0.6 ? Colors.orange : Colors.red);

    return Card(
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: color.withOpacity(0.2),
          child: Icon(Icons.medication, color: color),
        ),
        title: Text(name),
        subtitle: LinearProgressIndicator(
          value: rate,
          backgroundColor: theme.colorScheme.surfaceContainerHighest,
          color: color,
        ),
        trailing: Text(
          '${(rate * 100).toInt()}%',
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
      ),
    );
  }

  void _shareReport(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Sharing adherence report...')),
    );
  }

  void _exportReport(BuildContext context) {
    showModalBottomSheet(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.picture_as_pdf),
              title: const Text('Export as PDF'),
              onTap: () {
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Exporting PDF...')),
                );
              },
            ),
            ListTile(
              leading: const Icon(Icons.table_chart),
              title: const Text('Export as CSV'),
              onTap: () {
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Exporting CSV...')),
                );
              },
            ),
            ListTile(
              leading: const Icon(Icons.qr_code),
              title: const Text('Generate QR Code'),
              subtitle: const Text('For healthcare provider'),
              onTap: () {
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Generating QR code...')),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
