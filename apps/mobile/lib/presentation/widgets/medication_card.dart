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
                          : theme.colorScheme.primaryContainer,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      _getMedicationIcon(medication.form),
                      color: medication.isCritical
                          ? Colors.red
                          : theme.colorScheme.primary,
                      size: 28,
                      semanticLabel: medication.form,
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
                              Tooltip(
                                message: 'Critical medication',
                                child: Icon(
                                  Icons.warning_amber_rounded,
                                  color: Colors.red,
                                  size: 20,
                                  semanticLabel: 'Critical medication',
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${medication.dosage} • ${medication.form}',
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              if (medication.instructions != null) ...[
                const SizedBox(height: 12),
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
                      Icons.inventory_2_outlined,
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
                      backgroundColor: theme.colorScheme.primary,
                      foregroundColor: theme.colorScheme.onPrimary,
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

  IconData _getMedicationIcon(String form) {
    switch (form.toLowerCase()) {
      case 'tablet':
      case 'pill':
        return Icons.medication;
      case 'capsule':
        return Icons.medication_outlined;
      case 'liquid':
      case 'syrup':
        return Icons.local_drink;
      case 'injection':
        return Icons.vaccines;
      case 'inhaler':
        return Icons.air;
      case 'cream':
      case 'ointment':
        return Icons.spa;
      case 'drops':
        return Icons.water_drop;
      case 'patch':
        return Icons.healing;
      default:
        return Icons.medication;
    }
  }
}
