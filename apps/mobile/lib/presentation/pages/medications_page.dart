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
              leading: const Icon(Icons.loop, color: Colors.blue),
              title: const Text('Ongoing only'),
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
            icon: const Icon(Icons.edit),
            onPressed: () => _editMedication(context, ref),
            tooltip: 'Edit',
          ),
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
                    medication.isTablet ? Icons.medication : Icons.water_drop,
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
                  // Dosage display
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      if (medication.isTablet) ...[
                        ...List.generate(
                          medication.dosageAmount.clamp(0, 5),
                          (_) => const Icon(Icons.medication, color: Colors.blue, size: 24),
                        ),
                        if (medication.dosageAmount > 5)
                          Text(' +${medication.dosageAmount - 5}', style: const TextStyle(color: Colors.blue)),
                      ] else if (medication.isMl) ...[
                        Text('${medication.dosageAmount} ml', 
                          style: const TextStyle(color: Colors.blue, fontWeight: FontWeight.bold, fontSize: 18)),
                        const SizedBox(width: 4),
                        const Icon(Icons.water_drop, color: Colors.blue, size: 24),
                      ],
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
          _buildDetailRow(context, 'Duration', medication.durationDisplay),
          
          const SizedBox(height: 24),
          
          // Edit button at bottom
          ElevatedButton.icon(
            onPressed: () => _editMedication(context, ref),
            icon: const Icon(Icons.edit),
            label: const Text('Edit Medication'),
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
              backgroundColor: Colors.blue,
              foregroundColor: Colors.white,
            ),
          ),
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

  void _editMedication(BuildContext context, WidgetRef ref) async {
    final result = await Navigator.push<MedicationModel>(
      context,
      MaterialPageRoute(
        builder: (_) => EditMedicationPage(medication: medication),
      ),
    );
    
    if (result != null && context.mounted) {
      // Go back to medications list and refresh
      Navigator.pop(context);
      ref.invalidate(medicationsProvider(medication.userId));
    }
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
  
  int _amount = 1;
  String _unit = 'tablet'; // 'tablet' or 'ml'
  int _frequency = 1;
  String _frequencyMode = '12h'; // '24h' = full day, '12h' = waking hours only
  TimeOfDay _firstDoseTime = const TimeOfDay(hour: 8, minute: 0);
  bool _isLoading = false;
  int _durationDays = 0; // 0 = ongoing, 1-99 = fixed days

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
    return MedicationModel.calculateScheduleTimes(_firstDoseTimeString, _frequency, mode: _frequencyMode);
  }

  int get _intervalHours {
    final totalHours = _frequencyMode == '24h' ? 24 : 12;
    return totalHours ~/ _frequency;
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
            
            // Dosage unit selection
            Text('💊 Dosage Type', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: ChoiceChip(
                    label: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.medication, size: 18),
                        SizedBox(width: 4),
                        Text('Tablet'),
                      ],
                    ),
                    selected: _unit == 'tablet',
                    onSelected: (selected) {
                      if (selected) setState(() {
                        _unit = 'tablet';
                        _amount = _amount.clamp(1, 10);
                      });
                    },
                    selectedColor: Colors.blue.shade100,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ChoiceChip(
                    label: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.water_drop, size: 18),
                        SizedBox(width: 4),
                        Text('ml (liquid)'),
                      ],
                    ),
                    selected: _unit == 'ml',
                    onSelected: (selected) {
                      if (selected) setState(() => _unit = 'ml');
                    },
                    selectedColor: Colors.blue.shade100,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            
            // Dosage amount
            Text('${_unit == 'tablet' ? '💊' : '💧'} Amount per dose', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: Slider(
                    value: _amount.toDouble(),
                    min: 1,
                    max: _unit == 'tablet' ? 10 : 50,
                    divisions: _unit == 'tablet' ? 9 : 49,
                    label: '$_amount',
                    onChanged: (v) => setState(() => _amount = v.round()),
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
                      Text('$_amount', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                      const SizedBox(width: 4),
                      Icon(
                        _unit == 'tablet' ? Icons.medication : Icons.water_drop, 
                        color: Colors.blue, 
                        size: 20
                      ),
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
            
            // Frequency mode selection (only show when frequency > 1)
            if (_frequency > 1) ...[
              Text('🌙 Frequency Mode', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: ChoiceChip(
                      label: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.wb_sunny, size: 16),
                          SizedBox(width: 4),
                          Text('Waking (12h)'),
                        ],
                      ),
                      selected: _frequencyMode == '12h',
                      onSelected: (selected) {
                        if (selected) setState(() => _frequencyMode = '12h');
                      },
                      selectedColor: Colors.green.shade100,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ChoiceChip(
                      label: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.nightlight_round, size: 16),
                          SizedBox(width: 4),
                          Text('Full Day (24h)'),
                        ],
                      ),
                      selected: _frequencyMode == '24h',
                      onSelected: (selected) {
                        if (selected) setState(() => _frequencyMode = '24h');
                      },
                      selectedColor: Colors.purple.shade100,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                _frequencyMode == '12h' 
                    ? 'Spread doses over 12 waking hours (8AM-8PM)' 
                    : 'Spread doses over full 24 hours including night',
                style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
              ),
              const SizedBox(height: 12),
            ],
            
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
                          '(Every $_intervalHours hours)',
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
            
            // Duration with up/down buttons
            Text('📆 Duration', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                border: Border.all(color: Colors.grey.shade300),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _durationDays == 0 ? 'Ongoing' : '$_durationDays days',
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                        Text(
                          _durationDays == 0 ? 'No end date' : 'Fixed duration',
                          style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                        ),
                      ],
                    ),
                  ),
                  Row(
                    children: [
                      // Down button
                      IconButton(
                        onPressed: _durationDays > 0 
                            ? () => setState(() => _durationDays--) 
                            : null,
                        icon: const Icon(Icons.remove_circle_outline),
                        iconSize: 32,
                        color: Colors.blue,
                      ),
                      Container(
                        width: 50,
                        alignment: Alignment.center,
                        child: Text(
                          '$_durationDays',
                          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                        ),
                      ),
                      // Up button
                      IconButton(
                        onPressed: _durationDays < 99 
                            ? () => setState(() => _durationDays++) 
                            : null,
                        icon: const Icon(Icons.add_circle_outline),
                        iconSize: 32,
                        color: Colors.blue,
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              '0 = Ongoing (no end date), 1-99 = Fixed number of days',
              style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
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
        dosage: '$_amount ${_unit}${_unit == 'tablet' && _amount > 1 ? 's' : ''}',
        form: _unit == 'tablet' ? 'tablet' : 'liquid',
        instructions: _instructionsController.text.trim().isNotEmpty 
            ? _instructionsController.text.trim() 
            : null,
        isCritical: false,
        frequency: _frequency,
        firstDoseTime: _firstDoseTimeString,
        scheduleTimes: _scheduleTimes,
        durationDays: _durationDays,
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


// Edit Medication Page
class EditMedicationPage extends ConsumerStatefulWidget {
  final MedicationModel medication;
  
  const EditMedicationPage({super.key, required this.medication});

  @override
  ConsumerState<EditMedicationPage> createState() => _EditMedicationPageState();
}

class _EditMedicationPageState extends ConsumerState<EditMedicationPage> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _nameController;
  late TextEditingController _instructionsController;
  
  late int _amount;
  late String _unit;
  late int _frequency;
  late String _frequencyMode;
  late TimeOfDay _firstDoseTime;
  late int _durationDays;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    // Initialize with existing medication data
    _nameController = TextEditingController(text: widget.medication.name);
    _instructionsController = TextEditingController(text: widget.medication.instructions ?? '');
    
    _amount = widget.medication.dosageAmount;
    _unit = widget.medication.isTablet ? 'tablet' : 'ml';
    _frequency = widget.medication.frequency;
    _frequencyMode = '12h'; // Default
    _durationDays = widget.medication.durationDays;
    
    // Parse first dose time
    final timeParts = widget.medication.firstDoseTime.split(':');
    if (timeParts.length == 2) {
      _firstDoseTime = TimeOfDay(
        hour: int.tryParse(timeParts[0]) ?? 8,
        minute: int.tryParse(timeParts[1]) ?? 0,
      );
    } else {
      _firstDoseTime = const TimeOfDay(hour: 8, minute: 0);
    }
  }

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
    return MedicationModel.calculateScheduleTimes(_firstDoseTimeString, _frequency, mode: _frequencyMode);
  }

  int get _intervalHours {
    final totalHours = _frequencyMode == '24h' ? 24 : 12;
    return totalHours ~/ _frequency;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Edit Medication'),
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
            
            // Dosage unit selection
            Text('💊 Dosage Type', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: ChoiceChip(
                    label: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.medication, size: 18),
                        SizedBox(width: 4),
                        Text('Tablet'),
                      ],
                    ),
                    selected: _unit == 'tablet',
                    onSelected: (selected) {
                      if (selected) setState(() {
                        _unit = 'tablet';
                        _amount = _amount.clamp(1, 10);
                      });
                    },
                    selectedColor: Colors.blue.shade100,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ChoiceChip(
                    label: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.water_drop, size: 18),
                        SizedBox(width: 4),
                        Text('ml (liquid)'),
                      ],
                    ),
                    selected: _unit == 'ml',
                    onSelected: (selected) {
                      if (selected) setState(() => _unit = 'ml');
                    },
                    selectedColor: Colors.blue.shade100,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            
            // Dosage amount
            Text('${_unit == 'tablet' ? '💊' : '💧'} Amount per dose', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: Slider(
                    value: _amount.toDouble(),
                    min: 1,
                    max: _unit == 'tablet' ? 10 : 50,
                    divisions: _unit == 'tablet' ? 9 : 49,
                    label: '$_amount',
                    onChanged: (v) => setState(() => _amount = v.round()),
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
                      Text('$_amount', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                      const SizedBox(width: 4),
                      Icon(
                        _unit == 'tablet' ? Icons.medication : Icons.water_drop, 
                        color: Colors.blue, 
                        size: 20
                      ),
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
            
            // Frequency mode selection (only show when frequency > 1)
            if (_frequency > 1) ...[
              Text('🌙 Frequency Mode', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: ChoiceChip(
                      label: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.wb_sunny, size: 16),
                          SizedBox(width: 4),
                          Text('Waking (12h)'),
                        ],
                      ),
                      selected: _frequencyMode == '12h',
                      onSelected: (selected) {
                        if (selected) setState(() => _frequencyMode = '12h');
                      },
                      selectedColor: Colors.green.shade100,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ChoiceChip(
                      label: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.nightlight_round, size: 16),
                          SizedBox(width: 4),
                          Text('Full Day (24h)'),
                        ],
                      ),
                      selected: _frequencyMode == '24h',
                      onSelected: (selected) {
                        if (selected) setState(() => _frequencyMode = '24h');
                      },
                      selectedColor: Colors.purple.shade100,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                _frequencyMode == '12h' 
                    ? 'Spread doses over 12 waking hours (8AM-8PM)' 
                    : 'Spread doses over full 24 hours including night',
                style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
              ),
              const SizedBox(height: 12),
            ],
            
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
                          '(Every $_intervalHours hours)',
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
            
            // Duration with up/down buttons
            Text('📆 Duration', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                border: Border.all(color: Colors.grey.shade300),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _durationDays == 0 ? 'Ongoing' : '$_durationDays days',
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                        Text(
                          _durationDays == 0 ? 'No end date' : 'Fixed duration',
                          style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                        ),
                      ],
                    ),
                  ),
                  Row(
                    children: [
                      IconButton(
                        onPressed: _durationDays > 0 
                            ? () => setState(() => _durationDays--) 
                            : null,
                        icon: const Icon(Icons.remove_circle_outline),
                        iconSize: 32,
                        color: Colors.blue,
                      ),
                      Container(
                        width: 50,
                        alignment: Alignment.center,
                        child: Text(
                          '$_durationDays',
                          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                        ),
                      ),
                      IconButton(
                        onPressed: _durationDays < 99 
                            ? () => setState(() => _durationDays++) 
                            : null,
                        icon: const Icon(Icons.add_circle_outline),
                        iconSize: 32,
                        color: Colors.blue,
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              '0 = Ongoing (no end date), 1-99 = Fixed number of days',
              style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
            ),
            const SizedBox(height: 24),
            
            // Save button
            ElevatedButton(
              onPressed: _isLoading ? null : _updateMedication,
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
                  : const Text('Save Changes', style: TextStyle(fontSize: 16)),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _updateMedication() async {
    if (_formKey.currentState?.validate() != true) return;

    setState(() => _isLoading = true);

    try {
      final updatedMedication = widget.medication.copyWith(
        name: _nameController.text.trim(),
        dosage: '$_amount ${_unit}${_unit == 'tablet' && _amount > 1 ? 's' : ''}',
        form: _unit == 'tablet' ? 'tablet' : 'liquid',
        instructions: _instructionsController.text.trim().isNotEmpty 
            ? _instructionsController.text.trim() 
            : null,
        frequency: _frequency,
        firstDoseTime: _firstDoseTimeString,
        scheduleTimes: _scheduleTimes,
        durationDays: _durationDays,
        updatedAt: DateTime.now(),
      );

      final notifier = ref.read(medicationNotifierProvider(widget.medication.userId).notifier);
      await notifier.updateMedication(updatedMedication);

      if (mounted) {
        Navigator.pop(context, updatedMedication);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${updatedMedication.name} updated successfully')),
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
