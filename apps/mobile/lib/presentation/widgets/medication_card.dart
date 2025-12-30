import 'package:flutter/material.dart';
import '../../data/models/medication_model.dart';

class MedicationCard extends StatelessWidget {
  final MedicationModel medication;
  final VoidCallback? onTap;
  final VoidCallback? onTakeDose;

  const MedicationCard({
    super.key,
    required this.medication,
    this.onTap,
    this.onTakeDose,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: medication.isCritical 
            ? const BorderSide(color: Colors.red, width: 2)
            : BorderSide.none,
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  // Medication icon
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: medication.isCritical
                          ? Colors.red.shade100
                          : Colors.blue.shade100,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      medication.isTablet ? Icons.medication : Icons.water_drop,
                      color: medication.isCritical ? Colors.red : Colors.blue,
                      size: 28,
                    ),
                  ),
                  const SizedBox(width: 16),
                  // Medication info
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                medication.name,
                                style: theme.textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                            if (medication.isCritical)
                              const Icon(Icons.warning_amber_rounded, color: Colors.red, size: 20),
                          ],
                        ),
                        const SizedBox(height: 4),
                        // Dosage display
                        Row(
                          children: [
                            if (medication.isTablet) ...[
                              ...List.generate(
                                medication.dosageAmount.clamp(0, 5),
                                (_) => const Icon(Icons.medication, color: Colors.blue, size: 16),
                              ),
                              if (medication.dosageAmount > 5)
                                Text(' +${medication.dosageAmount - 5}', 
                                  style: const TextStyle(color: Colors.blue, fontSize: 12)),
                            ] else if (medication.isMl) ...[
                              Text('${medication.dosageAmount} ml', 
                                style: const TextStyle(color: Colors.blue, fontWeight: FontWeight.bold, fontSize: 14)),
                              const SizedBox(width: 4),
                              const Icon(Icons.water_drop, color: Colors.blue, size: 16),
                            ] else ...[
                              Text(medication.dosage, 
                                style: const TextStyle(color: Colors.blue, fontSize: 12)),
                            ],
                            const SizedBox(width: 8),
                            Text(
                              '(${medication.dosage})',
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: theme.colorScheme.onSurfaceVariant,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              
              // Schedule times
              if (medication.scheduleTimes.isNotEmpty) ...[
                const SizedBox(height: 12),
                Row(
                  children: [
                    const Icon(Icons.schedule, size: 16, color: Colors.grey),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Wrap(
                        spacing: 6,
                        runSpacing: 4,
                        children: medication.scheduleTimes.map((time) => Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.blue.shade50,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            time,
                            style: TextStyle(fontSize: 11, color: Colors.blue.shade700),
                          ),
                        )).toList(),
                      ),
                    ),
                    if (medication.frequency > 1)
                      Text(
                        '${medication.frequency}x/day',
                        style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                      ),
                  ],
                ),
              ],
              
              if (medication.instructions != null) ...[
                const SizedBox(height: 8),
                Text(
                  medication.instructions!,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
              
              // Duration indicator
              const SizedBox(height: 12),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: medication.isOngoing ? Colors.green.shade100 : Colors.orange.shade100,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          medication.isOngoing ? Icons.all_inclusive : Icons.calendar_today,
                          size: 14,
                          color: medication.isOngoing ? Colors.green.shade700 : Colors.orange.shade700,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          medication.isOngoing ? 'Ongoing' : medication.duration,
                          style: TextStyle(
                            fontSize: 12,
                            color: medication.isOngoing ? Colors.green.shade700 : Colors.orange.shade700,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              
              // Take dose button
              if (onTakeDose != null) ...[
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: onTakeDose,
                    icon: const Icon(Icons.check_circle_outline),
                    label: const Text('Take Dose'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue,
                      foregroundColor: Colors.white,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
