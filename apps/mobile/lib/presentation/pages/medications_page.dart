import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import '../../data/models/medication_model.dart';
import '../providers/auth_provider.dart';
import '../providers/medication_provider.dart';
import '../widgets/medication_card.dart';

class MedicationsPage extends ConsumerWidget {
  const MedicationsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final userId = ref.watch(currentUserIdProvider);

    if (userId == null) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final medicationsAsync = ref.watch(medicationsProvider(userId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Medications'),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: () => _showFilters(context),
            tooltip: 'Filter',
          ),
        ],
      ),
      body: RefreshIndicator(
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
          data: (medications) => medications.isEmpty
              ? _buildEmptyState(context)
              : ListView.builder(
                  padding: const EdgeInsets.only(top: 8, bottom: 80),
                  itemCount: medications.length,
                  itemBuilder: (context, index) {
                    final medication = medications[index];
                    return MedicationCard(
                      medication: medication,
                      onTap: () => _openMedicationDetails(context, ref, medication),
                    );
                  },
                ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'medications_fab',
        onPressed: () => _addMedication(context, ref, userId),
        icon: const Icon(Icons.add),
        label: const Text('Add Medication'),
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.water_drop_outlined, size: 80, color: Colors.blue.shade300),
          const SizedBox(height: 16),
          Text(
            'No medications yet',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              color: Colors.grey.shade600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Add your first medication to get started',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: Colors.grey.shade500,
            ),
          ),
        ],
      ),
    );
  }

  void _showFilters(BuildContext context) {
    showModalBottomSheet(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.all_inclusive),
              title: const Text('All medications'),
              onTap: () => Navigator.pop(ctx),
            ),
            ListTile(
              leading: const Icon(Icons.warning, color: Colors.red),
              title: const Text('Critical only'),
              onTap: () => Navigator.pop(ctx),
            ),
            ListTile(
              leading: const Icon(Icons.water_drop, color: Colors.orange),
              title: const Text('Low supply'),
              onTap: () => Navigator.pop(ctx),
            ),
          ],
        ),
      ),
    );
  }

  void _openMedicationDetails(BuildContext context, WidgetRef ref, MedicationModel medication) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => MedicationDetailsPage(medication: medication),
      ),
    );
  }

  void _addMedication(BuildContext context, WidgetRef ref, String userId) async {
    final result = await Navigator.push<MedicationModel>(
      context,
      MaterialPageRoute(builder: (_) => AddMedicationPage(userId: userId)),
    );
    
    if (result != null) {
      ref.invalidate(medicationsProvider(userId));
    }
  }
}

class MedicationDetailsPage extends ConsumerWidget {
  final MedicationModel medication;

  const MedicationDetailsPage({super.key, required this.medication});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(medication.name),
        actions: [
          IconButton(
            icon: const Icon(Icons.delete),
            onPressed: () => _confirmDelete(context, ref),
            tooltip: 'Delete',
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Icon(
                    Icons.water_drop,
                    size: 64,
                    color: medication.isCritical ? Colors.red : Colors.blue,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    medication.name,
                    style: theme.textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  // Droplets display
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      ...List.generate(
                        medication.dropletCount.clamp(0, 5),
                        (_) => const Icon(Icons.water_drop, color: Colors.blue, size: 24),
                      ),
                      if (medication.dropletCount > 5)
                        Text(' +${medication.dropletCount - 5}', style: const TextStyle(color: Colors.blue)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(medication.dosage, style: theme.textTheme.bodyMedium),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          
          // Schedule times
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.schedule, color: Colors.blue),
                      const SizedBox(width: 8),
                      Text('Schedule', style: theme.textTheme.titleMedium),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text('${medication.frequency}x daily', style: theme.textTheme.bodyLarge),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: medication.scheduleTimes.map((time) => Chip(
                      avatar: const Icon(Icons.access_time, size: 16),
                      label: Text(time),
                      backgroundColor: Colors.blue.shade50,
                    )).toList(),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          
          _buildDetailRow(context, 'Instructions', medication.instructions ?? 'None'),
          _buildDetailRow(context, 'Supply', '${medication.currentSupply ?? 0} droplets remaining'),
          _buildDetailRow(context, 'Critical', medication.isCritical ? 'Yes ⚠️' : 'No'),
        ],
      ),
    );
  }

  Widget _buildDetailRow(BuildContext context, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
          ),
          Expanded(
            child: Text(value, style: Theme.of(context).textTheme.bodyMedium),
          ),
        ],
      ),
    );
  }

  void _confirmDelete(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Medication'),
        content: Text('Are you sure you want to delete ${medication.name}?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                final notifier = ref.read(medicationNotifierProvider(medication.userId).notifier);
                await notifier.deleteMedication(medication.id);
                if (context.mounted) {
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('${medication.name} deleted')),
                  );
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Error: $e')),
                  );
                }
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }
}

class AddMedicationPage extends ConsumerStatefulWidget {
  final String userId;
  
  const AddMedicationPage({super.key, required this.userId});

  @override
  ConsumerState<AddMedicationPage> createState() => _AddMedicationPageState();
}

class _AddMedicationPageState extends ConsumerState<AddMedicationPage> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _instructionsController = TextEditingController();
  
  int _droplets = 1;
  int _frequency = 1;
  TimeOfDay _firstDoseTime = const TimeOfDay(hour: 8, minute: 0);
  bool _isCritical = false;
  bool _isLoading = false;

  @override
  void dispose() {
    _nameController.dispose();
    _instructionsController.dispose();
    super.dispose();
  }

  String get _firstDoseTimeString {
    return '${_firstDoseTime.hour.toString().padLeft(2, '0')}:${_firstDoseTime.minute.toString().padLeft(2, '0')}';
  }

  List<String> get _scheduleTimes {
    return MedicationModel.calculateScheduleTimes(_firstDoseTimeString, _frequency);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Add Medication'),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Name
            TextFormField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: 'Medication Name *',
                hintText: 'e.g., Lisinopril',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.water_drop),
              ),
              validator: (v) => v?.isEmpty == true ? 'Required' : null,
              textCapitalization: TextCapitalization.words,
            ),
            const SizedBox(height: 24),
            
            // Droplets
            Text('💧 Droplets per dose', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: Slider(
                    value: _droplets.toDouble(),
                    min: 1,
                    max: 10,
                    divisions: 9,
                    label: '$_droplets',
                    onChanged: (v) => setState(() => _droplets = v.round()),
                  ),
                ),
                Container(
                  width: 80,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.blue.shade50,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text('$_droplets', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                      const SizedBox(width: 4),
                      const Icon(Icons.water_drop, color: Colors.blue, size: 20),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            
            // First dose time
            Text('⏰ First dose time', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            InkWell(
              onTap: () async {
                final time = await showTimePicker(
                  context: context,
                  initialTime: _firstDoseTime,
                );
                if (time != null) {
                  setState(() => _firstDoseTime = time);
                }
              },
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey.shade300),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.access_time, color: Colors.blue),
                    const SizedBox(width: 12),
                    Text(
                      _firstDoseTime.format(context),
                      style: const TextStyle(fontSize: 18),
                    ),
                    const Spacer(),
                    const Icon(Icons.edit, color: Colors.grey),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            
            // Frequency
            Text('📅 Frequency per day', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Row(
              children: [1, 2, 3, 4].map((freq) => Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: ChoiceChip(
                    label: Text('${freq}x'),
                    selected: _frequency == freq,
                    onSelected: (selected) {
                      if (selected) setState(() => _frequency = freq);
                    },
                    selectedColor: Colors.blue.shade100,
                  ),
                ),
              )).toList(),
            ),
            const SizedBox(height: 12),
            
            // Schedule preview
            if (_frequency > 0)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.blue.shade50,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Scheduled times:', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blue)),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: _scheduleTimes.map((time) => Chip(
                        avatar: const Icon(Icons.access_time, size: 16),
                        label: Text(time),
                        backgroundColor: Colors.white,
                      )).toList(),
                    ),
                    if (_frequency > 1)
                      Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Text(
                          '(Every ${24 ~/ _frequency} hours)',
                          style: TextStyle(color: Colors.blue.shade700, fontSize: 12),
                        ),
                      ),
                  ],
                ),
              ),
            const SizedBox(height: 24),
            
            // Instructions
            TextFormField(
              controller: _instructionsController,
              decoration: const InputDecoration(
                labelText: 'Instructions (optional)',
                hintText: 'e.g., Take with food',
                border: OutlineInputBorder(),
              ),
              maxLines: 2,
            ),
            const SizedBox(height: 16),
            
            // Critical
            SwitchListTile(
              title: const Text('⚠️ Critical Medication'),
              subtitle: const Text('Mark for emergency access'),
              value: _isCritical,
              onChanged: (v) => setState(() => _isCritical = v),
            ),
            const SizedBox(height: 24),
            
            // Save button
            ElevatedButton(
              onPressed: _isLoading ? null : _saveMedication,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                backgroundColor: Colors.blue,
                foregroundColor: Colors.white,
              ),
              child: _isLoading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Text('Save Medication', style: TextStyle(fontSize: 16)),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _saveMedication() async {
    if (_formKey.currentState?.validate() != true) return;

    setState(() => _isLoading = true);

    try {
      final medication = MedicationModel(
        id: const Uuid().v4(),
        userId: widget.userId,
        name: _nameController.text.trim(),
        dosage: '$_droplets droplet${_droplets > 1 ? 's' : ''}',
        form: 'drops',
        instructions: _instructionsController.text.trim().isNotEmpty 
            ? _instructionsController.text.trim() 
            : null,
        isCritical: _isCritical,
        currentSupply: 30,
        lowSupplyThreshold: 7,
        frequency: _frequency,
        firstDoseTime: _firstDoseTimeString,
        scheduleTimes: _scheduleTimes,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      final notifier = ref.read(medicationNotifierProvider(widget.userId).notifier);
      await notifier.addMedication(medication);

      if (mounted) {
        Navigator.pop(context, medication);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${medication.name} added successfully')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }
}
