import 'package:flutter/material.dart';

class ReminderCard extends StatelessWidget {
  final String medicationName;
  final String dosage;
  final String time;
  final bool isPending;
  final bool isCritical;
  final VoidCallback? onTake;
  final VoidCallback? onSkip;
  final VoidCallback? onSnooze;

  const ReminderCard({
    super.key,
    required this.medicationName,
    required this.dosage,
    required this.time,
    this.isPending = true,
    this.isCritical = false,
    this.onTake,
    this.onSkip,
    this.onSnooze,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      color: isCritical ? Colors.red.shade50 : null,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: isPending
                        ? (isCritical ? Colors.red.shade100 : Colors.orange.shade100)
                        : Colors.green.shade100,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    isPending ? Icons.access_time : Icons.check_circle,
                    color: isPending
                        ? (isCritical ? Colors.red : Colors.orange)
                        : Colors.green,
                    semanticLabel: isPending ? 'Pending' : 'Completed',
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        medicationName,
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        dosage,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
                Text(
                  time,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: isPending ? theme.colorScheme.primary : Colors.green,
                  ),
                ),
              ],
            ),
            if (isPending && (onTake != null || onSkip != null || onSnooze != null)) ...[
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  if (onSnooze != null)
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: onSnooze,
                        icon: const Icon(Icons.snooze, size: 18),
                        label: const Text('Snooze'),
                      ),
                    ),
                  if (onSnooze != null && onSkip != null) const SizedBox(width: 8),
                  if (onSkip != null)
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: onSkip,
                        icon: const Icon(Icons.close, size: 18),
                        label: const Text('Skip'),
                      ),
                    ),
                  if (onSkip != null && onTake != null) const SizedBox(width: 8),
                  if (onTake != null)
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: onTake,
                        icon: const Icon(Icons.check, size: 18),
                        label: const Text('Take'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: theme.colorScheme.primary,
                          foregroundColor: theme.colorScheme.onPrimary,
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
