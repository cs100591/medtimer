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
            icon: const Icon(Icons.search),
            onPressed: () => _showSearch(context),
            tooltip: 'Search medications',
          ),
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
          Icon(
            Icons.medication_outlined,
            size: 80,
            color: Colors.grey.shade400,
          ),
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

  void _showSearch(BuildContext context) {
    showSearch(
      context: context,
      delegate: MedicationSearchDelegate(),
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
              leading: const Icon(Icons.inventory_2, color: Colors.orange),
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

class MedicationSearchDelegate extends SearchDelegate<String> {
  @override
  List<Widget> buildActions(BuildContext context) {
    return [
      IconButton(
        icon: const Icon(Icons.clear),
        onPressed: () => query = '',
      ),
    ];
  }

  @override
  Widget buildLeading(BuildContext context) {
    return IconButton(
      icon: const Icon(Icons.arrow_back),
      onPressed: () => close(context, ''),
    );
  }

  @override
  Widget buildResults(BuildContext context) {
    return Center(child: Text('Results for: $query'));
  }

  @override
  Widget buildSuggestions(BuildContext context) {
    return const Center(child: Text('Type to search medications'));
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
            onPressed: () {},
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
                    Icons.medication,
                    size: 64,
                    color: medication.isCritical ? Colors.red : theme.colorScheme.primary,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    medication.name,
                    style: theme.textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  if (medication.genericName != null)
                    Text(
                      medication.genericName!,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  const SizedBox(height: 8),
                  Chip(
                    label: Text('${medication.dosage} ${medication.form}'),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          _buildDetailRow(context, 'Instructions', medication.instructions ?? 'None'),
          _buildDetailRow(context, 'Supply', '${medication.currentSupply ?? 0} remaining'),
          _buildDetailRow(context, 'Critical', medication.isCritical ? 'Yes' : 'No'),
          if (medication.costPerUnit != null)
            _buildDetailRow(
              context,
              'Cost',
              '${medication.currency ?? '\$'}${medication.costPerUnit!.toStringAsFixed(2)} per unit',
            ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: () {},
            icon: const Icon(Icons.schedule),
            label: const Text('View Schedule'),
          ),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: () {},
            icon: const Icon(Icons.history),
            label: const Text('View History'),
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
            child: Text(
              value,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
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
  final _genericNameController = TextEditingController();
  final _dosageController = TextEditingController();
  final _instructionsController = TextEditingController();
  final _supplyController = TextEditingController();
  String _selectedForm = 'Tablet';
  bool _isCritical = false;
  bool _isLoading = false;

  final _forms = ['Tablet', 'Capsule', 'Liquid', 'Injection', 'Inhaler', 'Cream', 'Drops', 'Patch'];

  @override
  void dispose() {
    _nameController.dispose();
    _genericNameController.dispose();
    _dosageController.dispose();
    _instructionsController.dispose();
    _supplyController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Add Medication'),
        actions: [
          IconButton(
            icon: const Icon(Icons.qr_code_scanner),
            onPressed: () {},
            tooltip: 'Scan barcode',
          ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: 'Medication Name *',
                hintText: 'e.g., Lisinopril',
                border: OutlineInputBorder(),
              ),
              validator: (v) => v?.isEmpty == true ? 'Required' : null,
              textCapitalization: TextCapitalization.words,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _genericNameController,
              decoration: const InputDecoration(
                labelText: 'Generic Name (optional)',
                hintText: 'e.g., Lisinopril',
                border: OutlineInputBorder(),
              ),
              textCapitalization: TextCapitalization.words,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _dosageController,
              decoration: const InputDecoration(
                labelText: 'Dosage *',
                hintText: 'e.g., 10mg',
                border: OutlineInputBorder(),
              ),
              validator: (v) => v?.isEmpty == true ? 'Required' : null,
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              value: _selectedForm,
              decoration: const InputDecoration(
                labelText: 'Form',
                border: OutlineInputBorder(),
              ),
              items: _forms.map((f) => DropdownMenuItem(value: f, child: Text(f))).toList(),
              onChanged: (v) => setState(() => _selectedForm = v!),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _instructionsController,
              decoration: const InputDecoration(
                labelText: 'Instructions',
                hintText: 'e.g., Take with food',
                border: OutlineInputBorder(),
              ),
              maxLines: 2,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _supplyController,
              decoration: const InputDecoration(
                labelText: 'Current Supply (optional)',
                hintText: 'e.g., 30',
                border: OutlineInputBorder(),
              ),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 16),
            SwitchListTile(
              title: const Text('Critical Medication'),
              subtitle: const Text('Mark as critical for emergency access'),
              value: _isCritical,
              onChanged: (v) => setState(() => _isCritical = v),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _isLoading ? null : _saveMedication,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              child: _isLoading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Save Medication'),
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
        genericName: _genericNameController.text.trim().isNotEmpty 
            ? _genericNameController.text.trim() 
            : null,
        dosage: _dosageController.text.trim(),
        form: _selectedForm,
        instructions: _instructionsController.text.trim().isNotEmpty 
            ? _instructionsController.text.trim() 
            : null,
        isCritical: _isCritical,
        currentSupply: _supplyController.text.isNotEmpty 
            ? int.tryParse(_supplyController.text) 
            : null,
        lowSupplyThreshold: 7,
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
