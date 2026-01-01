import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'dart:math';

class CaregiverPage extends StatefulWidget {
  const CaregiverPage({super.key});

  @override
  State<CaregiverPage> createState() => _CaregiverPageState();
}

class _CaregiverPageState extends State<CaregiverPage> {
  List<Map<String, dynamic>> _patients = [];
  List<Map<String, dynamic>> _notifications = [];
  bool _showInviteModal = false;
  Map<String, dynamic>? _selectedPatient;
  String _inviteCode = '';
  String _inviteLink = '';
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  String _permissionLevel = 'view';

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    final prefs = await SharedPreferences.getInstance();
    final patientsJson = prefs.getString('caregiver_patients');
    final notificationsJson = prefs.getString('caregiver_notifications');
    
    setState(() {
      if (patientsJson != null) {
        _patients = List<Map<String, dynamic>>.from(jsonDecode(patientsJson));
      }
      if (notificationsJson != null) {
        _notifications = List<Map<String, dynamic>>.from(jsonDecode(notificationsJson));
      }
    });
  }

  Future<void> _saveData() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('caregiver_patients', jsonEncode(_patients));
    await prefs.setString('caregiver_notifications', jsonEncode(_notifications));
  }


  String _generateInviteCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    final random = Random();
    return List.generate(8, (_) => chars[random.nextInt(chars.length)]).join();
  }

  void _openInviteModal() {
    setState(() {
      _showInviteModal = true;
      _inviteCode = _generateInviteCode();
      _inviteLink = 'https://medcare.app/invite/$_inviteCode';
      _nameController.clear();
      _emailController.clear();
      _permissionLevel = 'view';
    });
  }

  void _closeInviteModal() {
    setState(() => _showInviteModal = false);
  }

  void _addPatient() {
    if (_nameController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter patient name')),
      );
      return;
    }

    final patient = {
      'id': 'p${DateTime.now().millisecondsSinceEpoch}',
      'name': _nameController.text.trim(),
      'email': _emailController.text.trim().isNotEmpty 
          ? _emailController.text.trim() 
          : '${_nameController.text.toLowerCase().replaceAll(' ', '')}@patient.local',
      'permissionLevel': _permissionLevel,
      'status': 'active',
      'addedAt': DateTime.now().toIso8601String(),
      'adherenceRate': 75 + Random().nextInt(20),
      'medicationCount': 1 + Random().nextInt(5),
      'missedToday': Random().nextInt(2),
    };

    final notification = {
      'id': 'n${DateTime.now().millisecondsSinceEpoch}',
      'patientId': patient['id'],
      'patientName': patient['name'],
      'message': '${patient['name']} added',
      'type': 'info',
      'timestamp': DateTime.now().toIso8601String(),
    };

    setState(() {
      _patients.add(patient);
      _notifications.insert(0, notification);
      if (_notifications.length > 10) _notifications = _notifications.sublist(0, 10);
    });
    _saveData();
    _closeInviteModal();
  }

  void _removePatient(String patientId) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Remove Patient'),
        content: const Text('Are you sure you want to remove this patient?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              setState(() {
                _patients.removeWhere((p) => p['id'] == patientId);
                _notifications.removeWhere((n) => n['patientId'] == patientId);
                _selectedPatient = null;
              });
              _saveData();
              Navigator.pop(ctx);
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Remove'),
          ),
        ],
      ),
    );
  }

  void _copyToClipboard(String text, String label) {
    Clipboard.setData(ClipboardData(text: text));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('$label copied!')),
    );
  }

  String _formatTime(String timestamp) {
    final diff = DateTime.now().difference(DateTime.parse(timestamp));
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }


  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF2F2F7),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Caregiver Portal',
              style: TextStyle(
                color: Color(0xFF1C1C1E),
                fontWeight: FontWeight.w600,
                fontSize: 18,
              ),
            ),
            Text(
              'Monitor & support your patients',
              style: TextStyle(
                color: Color(0xFF8E8E93),
                fontSize: 12,
                fontWeight: FontWeight.normal,
              ),
            ),
          ],
        ),
        actions: [
          TextButton.icon(
            onPressed: _openInviteModal,
            icon: const Icon(Icons.add, color: Color(0xFF007AFF)),
            label: const Text('Add', style: TextStyle(color: Color(0xFF007AFF))),
          ),
        ],
      ),
      body: Stack(
        children: [
          _buildBody(),
          if (_showInviteModal) _buildInviteModal(),
          if (_selectedPatient != null) _buildPatientDetailModal(),
        ],
      ),
    );
  }

  Widget _buildBody() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (_patients.isEmpty)
          _buildEmptyState()
        else
          ..._patients.map((patient) => _buildPatientCard(patient)),
        
        const SizedBox(height: 20),
        _buildNotificationsCard(),
        const SizedBox(height: 80),
      ],
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
              child: Text('👥', style: TextStyle(fontSize: 40)),
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'No patients yet',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: Color(0xFF1C1C1E),
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Click "Add" to add a patient',
            style: TextStyle(
              fontSize: 14,
              color: Color(0xFF8E8E93),
            ),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _openInviteModal,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF007AFF),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            child: const Text('Add Patient'),
          ),
        ],
      ),
    );
  }


  Widget _buildPatientCard(Map<String, dynamic> patient) {
    final adherenceRate = patient['adherenceRate'] as int;
    final adherenceColor = adherenceRate >= 80 
        ? const Color(0xFF32D74B) 
        : const Color(0xFFFF9500);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: const Color(0xFF007AFF).withOpacity(0.12),
                    shape: BoxShape.circle,
                  ),
                  child: const Center(
                    child: Text('👤', style: TextStyle(fontSize: 24)),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        patient['name'] as String,
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 16,
                          color: Color(0xFF1C1C1E),
                        ),
                      ),
                      Text(
                        patient['email'] as String,
                        style: const TextStyle(
                          fontSize: 13,
                          color: Color(0xFF8E8E93),
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: patient['permissionLevel'] == 'manage'
                        ? const Color(0xFF007AFF).withOpacity(0.12)
                        : const Color(0xFFFF9500).withOpacity(0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    patient['permissionLevel'] == 'manage' ? '🔧 Manage' : '👁️ View',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: patient['permissionLevel'] == 'manage'
                          ? const Color(0xFF007AFF)
                          : const Color(0xFFFF9500),
                    ),
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(
              border: Border(top: BorderSide(color: Color(0xFFE5E5EA))),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    children: [
                      Text(
                        '$adherenceRate%',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: adherenceColor,
                        ),
                      ),
                      const Text(
                        'Adherence',
                        style: TextStyle(fontSize: 11, color: Color(0xFF8E8E93)),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: Column(
                    children: [
                      Text(
                        '${patient['medicationCount']}',
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF007AFF),
                        ),
                      ),
                      const Text(
                        'Medications',
                        style: TextStyle(fontSize: 11, color: Color(0xFF8E8E93)),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: Column(
                    children: [
                      Text(
                        '${patient['missedToday']}',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: patient['missedToday'] > 0 
                              ? const Color(0xFFFF9500) 
                              : const Color(0xFF32D74B),
                        ),
                      ),
                      const Text(
                        'Missed Today',
                        style: TextStyle(fontSize: 11, color: Color(0xFF8E8E93)),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => setState(() => _selectedPatient = patient),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      side: const BorderSide(color: Color(0xFFE5E5EA)),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    child: const Text('📊 Report', style: TextStyle(color: Color(0xFF007AFF))),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton(
                    onPressed: () {},
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      side: const BorderSide(color: Color(0xFFE5E5EA)),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    child: const Text('💊 Meds', style: TextStyle(color: Color(0xFF007AFF))),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  onPressed: () => _removePatient(patient['id'] as String),
                  icon: const Icon(Icons.delete_outline, color: Color(0xFFFF3B30)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }


  Widget _buildNotificationsCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '🔔 Recent Notifications',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: Color(0xFF1C1C1E),
            ),
          ),
          const SizedBox(height: 12),
          if (_notifications.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: Center(
                child: Text(
                  'No notifications',
                  style: TextStyle(color: Color(0xFF8E8E93)),
                ),
              ),
            )
          else
            ..._notifications.take(5).map((notif) => Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: notif['type'] == 'success'
                    ? const Color(0xFF32D74B).withOpacity(0.1)
                    : notif['type'] == 'warning'
                        ? const Color(0xFFFF9500).withOpacity(0.1)
                        : const Color(0xFF007AFF).withOpacity(0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                children: [
                  Text(
                    notif['type'] == 'success' ? '✓' : notif['type'] == 'warning' ? '⚠️' : 'ℹ️',
                    style: const TextStyle(fontSize: 16),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          notif['message'] as String,
                          style: const TextStyle(
                            fontWeight: FontWeight.w500,
                            color: Color(0xFF1C1C1E),
                          ),
                        ),
                        Text(
                          _formatTime(notif['timestamp'] as String),
                          style: const TextStyle(
                            fontSize: 12,
                            color: Color(0xFF8E8E93),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            )),
        ],
      ),
    );
  }

  Widget _buildInviteModal() {
    return GestureDetector(
      onTap: _closeInviteModal,
      child: Container(
        color: Colors.black54,
        child: Center(
          child: GestureDetector(
            onTap: () {},
            child: Container(
              margin: const EdgeInsets.all(24),
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        const Expanded(
                          child: Text(
                            'Invite Patient',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF1C1C1E),
                            ),
                          ),
                        ),
                        IconButton(
                          onPressed: _closeInviteModal,
                          icon: const Icon(Icons.close),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _nameController,
                      decoration: InputDecoration(
                        labelText: 'Patient Name *',
                        filled: true,
                        fillColor: const Color(0xFFF2F2F7),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: BorderSide.none,
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      decoration: InputDecoration(
                        labelText: 'Patient Email (optional)',
                        filled: true,
                        fillColor: const Color(0xFFF2F2F7),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: BorderSide.none,
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Permission Level',
                      style: TextStyle(
                        fontWeight: FontWeight.w500,
                        color: Color(0xFF1C1C1E),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      decoration: BoxDecoration(
                        color: const Color(0xFFE5E5EA),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      padding: const EdgeInsets.all(4),
                      child: Row(
                        children: [
                          Expanded(
                            child: GestureDetector(
                              onTap: () => setState(() => _permissionLevel = 'view'),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 10),
                                decoration: BoxDecoration(
                                  color: _permissionLevel == 'view' ? Colors.white : Colors.transparent,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  '👁️ View Only',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    fontWeight: _permissionLevel == 'view' ? FontWeight.w600 : FontWeight.normal,
                                    color: _permissionLevel == 'view' ? const Color(0xFF007AFF) : const Color(0xFF8E8E93),
                                  ),
                                ),
                              ),
                            ),
                          ),
                          Expanded(
                            child: GestureDetector(
                              onTap: () => setState(() => _permissionLevel = 'manage'),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 10),
                                decoration: BoxDecoration(
                                  color: _permissionLevel == 'manage' ? Colors.white : Colors.transparent,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  '🔧 Co-Manage',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    fontWeight: _permissionLevel == 'manage' ? FontWeight.w600 : FontWeight.normal,
                                    color: _permissionLevel == 'manage' ? const Color(0xFF007AFF) : const Color(0xFF8E8E93),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),
                    const Divider(),
                    const SizedBox(height: 16),
                    const Text(
                      '📱 Scan to Invite',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF1C1C1E),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Center(
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          border: Border.all(color: const Color(0xFFE5E5EA)),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Image.network(
                          'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${Uri.encodeComponent(_inviteLink)}',
                          width: 150,
                          height: 150,
                          errorBuilder: (_, __, ___) => const SizedBox(
                            width: 150,
                            height: 150,
                            child: Center(child: Icon(Icons.qr_code, size: 80)),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF2F2F7),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            _inviteCode,
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              fontFamily: 'monospace',
                            ),
                          ),
                        ),
                        IconButton(
                          onPressed: () => _copyToClipboard(_inviteCode, 'Code'),
                          icon: const Icon(Icons.copy, color: Color(0xFF007AFF)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF2F2F7),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              _inviteLink,
                              style: const TextStyle(fontSize: 12, color: Color(0xFF8E8E93)),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ),
                        TextButton(
                          onPressed: () => _copyToClipboard(_inviteLink, 'Link'),
                          child: const Text('Copy'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: _closeInviteModal,
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              side: const BorderSide(color: Color(0xFFE5E5EA)),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                            ),
                            child: const Text('Cancel'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: ElevatedButton(
                            onPressed: _addPatient,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF007AFF),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                            ),
                            child: const Text('Add'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }


  Widget _buildPatientDetailModal() {
    final patient = _selectedPatient!;
    final adherenceRate = patient['adherenceRate'] as int;

    return GestureDetector(
      onTap: () => setState(() => _selectedPatient = null),
      child: Container(
        color: Colors.black54,
        child: Center(
          child: GestureDetector(
            onTap: () {},
            child: Container(
              margin: const EdgeInsets.all(24),
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      const Expanded(
                        child: Text(
                          '📊 Patient Report',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF1C1C1E),
                          ),
                        ),
                      ),
                      IconButton(
                        onPressed: () => setState(() => _selectedPatient = null),
                        icon: const Icon(Icons.close),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      color: const Color(0xFF007AFF).withOpacity(0.12),
                      shape: BoxShape.circle,
                    ),
                    child: const Center(
                      child: Text('👤', style: TextStyle(fontSize: 40)),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    patient['name'] as String,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF1C1C1E),
                    ),
                  ),
                  Text(
                    patient['email'] as String,
                    style: const TextStyle(
                      fontSize: 14,
                      color: Color(0xFF8E8E93),
                    ),
                  ),
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: const Color(0xFF32D74B).withOpacity(0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Column(
                            children: [
                              Text(
                                '$adherenceRate%',
                                style: const TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF32D74B),
                                ),
                              ),
                              const Text(
                                'Adherence',
                                style: TextStyle(fontSize: 12, color: Color(0xFF8E8E93)),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: const Color(0xFF007AFF).withOpacity(0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Column(
                            children: [
                              Text(
                                '${patient['medicationCount']}',
                                style: const TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF007AFF),
                                ),
                              ),
                              const Text(
                                'Medications',
                                style: TextStyle(fontSize: 12, color: Color(0xFF8E8E93)),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  const Text(
                    'This Week',
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF1C1C1E),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: ['M', 'T', 'W', 'T', 'F', 'S', 'S'].asMap().entries.map((entry) {
                      final i = entry.key;
                      final day = entry.value;
                      final completed = i < 5;
                      return Column(
                        children: [
                          Container(
                            width: 36,
                            height: 36,
                            decoration: BoxDecoration(
                              color: completed
                                  ? const Color(0xFF32D74B).withOpacity(0.2)
                                  : const Color(0xFFF2F2F7),
                              shape: BoxShape.circle,
                            ),
                            child: Center(
                              child: Text(
                                completed ? '✓' : '-',
                                style: TextStyle(
                                  color: completed ? const Color(0xFF32D74B) : const Color(0xFF8E8E93),
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            day,
                            style: const TextStyle(
                              fontSize: 12,
                              color: Color(0xFF8E8E93),
                            ),
                          ),
                        ],
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 24),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => setState(() => _selectedPatient = null),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            side: const BorderSide(color: Color(0xFFE5E5EA)),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                          child: const Text('Close'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: () => _removePatient(patient['id'] as String),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFFF3B30),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                          child: const Text('🗑️ Remove'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
