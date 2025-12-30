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
    final isLowSupply = medication.currentSupply != null &&
        medication.lowSupplyThreshold != null &&
        medication.currentSupply! <= medication.lowSupplyThreshold!;

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
                  // Droplet icon
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: medication.isCritical
                          ? Colors.red.shade100
                          : Colors.blue.shade100,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      Icons.water_drop,
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
                        // Droplets display
                        Row(
                          children: [
                            ...List.generate(
                              medication.dropletCount.clamp(0, 5),
                              (_) => const Icon(Icons.water_drop, color: Colors.blue, size: 16),
                            ),
                            if (medication.dropletCount > 5)
                              Text(' +${medication.dropletCount - 5}', 
                                style: const TextStyle(color: Colors.blue, fontSize: 12)),
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
              
              // Supply indicator
              if (medication.currentSupply != null) ...[
                const SizedBox(height: 12),
                Row(
                  children: [
                    Icon(
                      Icons.water_drop_outlined,
                      size: 16,
                      color: isLowSupply ? Colors.orange : theme.colorScheme.onSurfaceVariant,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '${medication.currentSupply} remaining',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: isLowSupply ? Colors.orange : theme.colorScheme.onSurfaceVariant,
                        fontWeight: isLowSupply ? FontWeight.bold : null,
                      ),
                    ),
                    if (isLowSupply) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: Colors.orange.shade100,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          'Low supply',
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: Colors.orange.shade800,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ],
              
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
