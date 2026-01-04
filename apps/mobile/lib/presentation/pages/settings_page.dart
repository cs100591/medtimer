import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/constants/app_constants.dart';
import '../../services/notification_service.dart';
import '../providers/auth_provider.dart';
import '../providers/settings_provider.dart';

class SettingsPage extends ConsumerStatefulWidget {
  const SettingsPage({super.key});

  @override
  ConsumerState<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends ConsumerState<SettingsPage> {
  bool _notificationsEnabled = true;
  bool _saved = false;
  int _scheduledNotificationsCount = 0;
  bool _batteryOptimizationDisabled = false;

  @override
  void initState() {
    super.initState();
    _loadNotificationSetting();
    _loadScheduledNotificationsCount();
    _checkBatteryOptimization();
  }

  Future<void> _loadNotificationSetting() async {
    final enabled = await NotificationService().areNotificationsEnabled();
    if (mounted) setState(() => _notificationsEnabled = enabled);
  }

  Future<void> _loadScheduledNotificationsCount() async {
    final pending = await NotificationService().getPendingNotifications();
    if (mounted) setState(() => _scheduledNotificationsCount = pending.length);
  }

  Future<void> _checkBatteryOptimization() async {
    final disabled = await NotificationService().isBatteryOptimizationDisabled();
    if (mounted) setState(() => _batteryOptimizationDisabled = disabled);
  }

  void _showSaved() {
    setState(() => _saved = true);
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) setState(() => _saved = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    final settings = ref.watch(settingsProvider);
    final settingsNotifier = ref.read(settingsProvider.notifier);
    final authState = ref.watch(authProvider);
    final user = authState.user;

    return Scaffold(
      backgroundColor: const Color(0xFFF2F2F7),
      appBar: AppBar(
        title: const Text('Settings'),
        backgroundColor: const Color(0xFFF2F2F7),
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Saved indicator
          if (_saved)
            Container(
              padding: const EdgeInsets.all(12),
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: const Color(0xFFE8F5E9),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.check_circle, color: Color(0xFF4CAF50), size: 20),
                  SizedBox(width: 8),
                  Text(
                    'Settings saved',
                    style: TextStyle(
                      color: Color(0xFF4CAF50),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),

          // Battery Optimization Info (non-warning style)
          if (!_batteryOptimizationDisabled)
            Container(
              padding: const EdgeInsets.all(16),
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: const Color(0xFFF5F5F5),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE0E0E0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.info_outline, color: Color(0xFF757575), size: 20),
                      SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Optimize Notification Delivery',
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF424242),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'For reliable medication reminders, consider disabling battery optimization for this app.',
                    style: TextStyle(
                      fontSize: 13,
                      color: Color(0xFF757575),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () async {
                            await NotificationService().showAllBatteryOptimizationDialogs();
                            await Future.delayed(const Duration(milliseconds: 500));
                            await _checkBatteryOptimization();
                          },
                          style: OutlinedButton.styleFrom(
                            foregroundColor: const Color(0xFF007AFF),
                            side: const BorderSide(color: Color(0xFF007AFF)),
                          ),
                          child: const Text('Configure'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

          // Accessibility Section
          _buildSectionCard(
            title: 'Accessibility',
            children: [
              _buildListItem(
                title: 'Language',
                subtitle: 'Select your preferred language',
                trailing: _buildSegmentedControl(
                  value: settings.language.code,
                  options: const {'en': 'EN', 'zh': '中文'},
                  onChanged: (value) {
                    final lang = AppLanguage.values.firstWhere(
                      (l) => l.code == value,
                      orElse: () => AppLanguage.en,
                    );
                    settingsNotifier.setLanguage(lang);
                    _showSaved();
                  },
                ),
              ),
              const Divider(height: 1),
              _buildListItem(
                title: 'Font Size',
                subtitle: 'Adjust text size for readability',
                trailing: DropdownButton<FontSizeOption>(
                  value: settings.fontSize,
                  underline: const SizedBox(),
                  items: FontSizeOption.values.map((size) {
                    return DropdownMenuItem(
                      value: size,
                      child: Text(size.name),
                    );
                  }).toList(),
                  onChanged: (value) {
                    if (value != null) {
                      settingsNotifier.setFontSize(value);
                      _showSaved();
                    }
                  },
                ),
              ),
              const Divider(height: 1),
              _buildSwitchItem(
                title: 'High Contrast',
                subtitle: 'Improve visibility with higher contrast',
                value: settings.highContrast,
                onChanged: (value) {
                  settingsNotifier.setHighContrast(value);
                  _showSaved();
                },
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Notifications Section
          _buildSectionCard(
            title: 'Notifications',
            children: [
              _buildSwitchItem(
                title: 'Enable Notifications',
                subtitle: 'Receive medication reminders',
                value: _notificationsEnabled,
                onChanged: (value) async {
                  await NotificationService().setNotificationsEnabled(value);
                  setState(() => _notificationsEnabled = value);
                  await _loadScheduledNotificationsCount();
                  _showSaved();
                },
              ),
              const Divider(height: 1),
              _buildListItem(
                title: 'Battery Optimization',
                subtitle: _batteryOptimizationDisabled
                    ? '✓ Disabled (recommended)'
                    : 'Enabled - tap to configure',
                trailing: TextButton(
                  onPressed: () async {
                    await NotificationService().showAllBatteryOptimizationDialogs();
                    await Future.delayed(const Duration(milliseconds: 500));
                    await _checkBatteryOptimization();
                  },
                  child: const Text('Configure'),
                ),
              ),
              const Divider(height: 1),
              _buildListItem(
                title: 'Scheduled Reminders',
                subtitle: '$_scheduledNotificationsCount active',
                trailing: TextButton(
                  onPressed: () async {
                    await _loadScheduledNotificationsCount();
                    if (!mounted) return;
                    final pending = await NotificationService().getPendingNotifications();
                    if (!mounted) return;
                    _showPendingNotificationsDialog(pending);
                  },
                  child: const Text('View'),
                ),
              ),
              const Divider(height: 1),
              _buildListItem(
                title: 'Test Notification',
                subtitle: 'Send a test notification now',
                trailing: TextButton(
                  onPressed: () async {
                    final messenger = ScaffoldMessenger.of(context);
                    await NotificationService().showTestNotification();
                    messenger.showSnackBar(
                      const SnackBar(content: Text('Test notification sent')),
                    );
                  },
                  child: const Text('Test'),
                ),
              ),
              const Divider(height: 1),
              _buildListItem(
                title: 'Schedule Test',
                subtitle: 'Schedule notification in 10 seconds',
                trailing: TextButton(
                  onPressed: () async {
                    final messenger = ScaffoldMessenger.of(context);
                    await NotificationService().scheduleTestNotification();
                    messenger.showSnackBar(
                      const SnackBar(
                        content: Text('Test notification scheduled for 10 seconds'),
                      ),
                    );
                    await _loadScheduledNotificationsCount();
                  },
                  child: const Text('Schedule'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Data & Privacy Section
          _buildSectionCard(
            title: 'Data & Privacy',
            children: [
              _buildButtonItem(
                icon: Icons.download,
                title: 'Export Data',
                onTap: _exportData,
              ),
              const Divider(height: 1),
              _buildButtonItem(
                icon: Icons.delete_outline,
                title: 'Delete All Data',
                isDestructive: true,
                onTap: _confirmDeleteData,
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Account Section
          if (user != null)
            _buildSectionCard(
              title: 'Account',
              children: [
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: const Color(0xFFE3F2FD),
                          borderRadius: BorderRadius.circular(24),
                        ),
                        child: Center(
                          child: Text(
                            user.fullName.isNotEmpty ? user.fullName[0].toUpperCase() : '?',
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF1976D2),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              user.fullName,
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 16,
                              ),
                            ),
                            Text(
                              user.email,
                              style: const TextStyle(
                                color: Color(0xFF8E8E93),
                                fontSize: 14,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const Divider(height: 1),
                _buildButtonItem(
                  icon: Icons.logout,
                  title: 'Logout',
                  isDestructive: true,
                  onTap: () => _confirmLogout(context, ref),
                ),
              ],
            ),
          const SizedBox(height: 16),

          // About Section
          _buildSectionCard(
            title: 'About',
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: const Color(0xFFF5F5F5),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Center(
                        child: Text('💊', style: TextStyle(fontSize: 24)),
                      ),
                    ),
                    const SizedBox(width: 12),
                    const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Medication Reminder',
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 16,
                          ),
                        ),
                        Text(
                          'Version 1.0.0',
                          style: TextStyle(
                            color: Color(0xFF8E8E93),
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const Padding(
                padding: EdgeInsets.fromLTRB(16, 0, 16, 16),
                child: Text(
                  'Your health data is stored securely on your device.',
                  style: TextStyle(
                    color: Color(0xFF8E8E93),
                    fontSize: 14,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildSectionCard({required String title, required List<Widget> children}) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Text(
              title,
              style: const TextStyle(
                fontWeight: FontWeight.w600,
                color: Color(0xFF1C1C1E),
              ),
            ),
          ),
          const Divider(height: 1),
          ...children,
        ],
      ),
    );
  }

  Widget _buildListItem({
    required String title,
    required String subtitle,
    required Widget trailing,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF1C1C1E),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 13,
                    color: Color(0xFF8E8E93),
                  ),
                ),
              ],
            ),
          ),
          trailing,
        ],
      ),
    );
  }

  Widget _buildSwitchItem({
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF1C1C1E),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 13,
                    color: Color(0xFF8E8E93),
                  ),
                ),
              ],
            ),
          ),
          Switch.adaptive(
            value: value,
            onChanged: onChanged,
            activeTrackColor: const Color(0xFF007AFF),
          ),
        ],
      ),
    );
  }

  Widget _buildButtonItem({
    required IconData icon,
    required String title,
    required VoidCallback onTap,
    bool isDestructive = false,
  }) {
    final color = isDestructive ? const Color(0xFF007AFF) : const Color(0xFF007AFF);
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(icon, color: color, size: 22),
            const SizedBox(width: 12),
            Text(
              title,
              style: TextStyle(
                color: color,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSegmentedControl({
    required String value,
    required Map<String, String> options,
    required ValueChanged<String> onChanged,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFF2F2F7),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: options.entries.map((entry) {
          final isSelected = entry.key == value;
          return GestureDetector(
            onTap: () => onChanged(entry.key),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: isSelected ? const Color(0xFF007AFF) : Colors.transparent,
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                entry.value,
                style: TextStyle(
                  color: isSelected ? Colors.white : const Color(0xFF8E8E93),
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  void _showPendingNotificationsDialog(List<PendingNotificationRequest> pending) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Scheduled Notifications'),
        content: SizedBox(
          width: double.maxFinite,
          child: pending.isEmpty
              ? const Text('No scheduled notifications')
              : ListView.builder(
                  shrinkWrap: true,
                  itemCount: pending.length,
                  itemBuilder: (context, index) {
                    return ListTile(
                      title: Text(pending[index].title ?? 'Notification'),
                      subtitle: Text(pending[index].body ?? ''),
                    );
                  },
                ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  void _exportData() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('📥 Exporting data...')),
    );
  }

  void _confirmDeleteData() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete All Data'),
        content: const Text(
          'This action cannot be undone. All your medication history and data will be deleted.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              final prefs = await SharedPreferences.getInstance();
              await prefs.clear();
              await NotificationService().cancelAllNotifications();
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('All data deleted')),
                );
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF007AFF),
              foregroundColor: Colors.white,
            ),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  void _confirmLogout(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Logout'),
        content: const Text('Are you sure you want to logout?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              ref.read(authProvider.notifier).logout();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF007AFF),
              foregroundColor: Colors.white,
            ),
            child: const Text('Logout'),
          ),
        ],
      ),
    );
  }
}
