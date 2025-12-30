import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/constants/app_constants.dart';
import '../providers/auth_provider.dart';
import '../providers/settings_provider.dart';

class SettingsPage extends ConsumerWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(settingsProvider);
    final settingsNotifier = ref.read(settingsProvider.notifier);
    final user = ref.watch(currentUserProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        children: [
          // User profile section
          if (user != null)
            _buildSection(context, 'Account', [
              ListTile(
                leading: CircleAvatar(
                  child: Text(user.firstName?.substring(0, 1).toUpperCase() ?? 'U'),
                ),
                title: Text(user.fullName),
                subtitle: Text(user.email),
              ),
              ListTile(
                leading: const Icon(Icons.logout, color: Colors.red),
                title: const Text('Logout', style: TextStyle(color: Colors.red)),
                onTap: () => _confirmLogout(context, ref),
              ),
            ]),
          _buildSection(context, 'Accessibility', [
            _buildLanguageTile(context, settings, settingsNotifier),
            _buildFontSizeTile(context, settings, settingsNotifier),
            SwitchListTile(
              title: const Text('High Contrast Mode'),
              subtitle: const Text('Increase visibility'),
              value: settings.highContrast,
              onChanged: settingsNotifier.setHighContrast,
            ),
            SwitchListTile(
              title: const Text('Voice Interface'),
              subtitle: const Text('Enable voice commands'),
              value: settings.voiceEnabled,
              onChanged: settingsNotifier.setVoiceEnabled,
            ),
          ]),
          _buildSection(context, 'Notifications', [
            SwitchListTile(
              title: const Text('Push Notifications'),
              subtitle: const Text('Receive reminder alerts'),
              value: settings.notificationsEnabled,
              onChanged: settingsNotifier.setNotificationsEnabled,
            ),
            ListTile(
              title: const Text('Notification Sound'),
              subtitle: const Text('Default'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {},
            ),
          ]),
          _buildSection(context, 'Data & Privacy', [
            ListTile(
              leading: const Icon(Icons.download),
              title: const Text('Export My Data'),
              onTap: () => _exportData(context),
            ),
            ListTile(
              leading: const Icon(Icons.delete_forever, color: Colors.red),
              title: const Text('Delete All Data'),
              onTap: () => _confirmDeleteData(context),
            ),
          ]),
          _buildSection(context, 'About', [
            const ListTile(
              title: Text('Version'),
              subtitle: Text('1.0.0'),
            ),
            ListTile(
              title: const Text('Privacy Policy'),
              trailing: const Icon(Icons.open_in_new),
              onTap: () {},
            ),
          ]),
        ],
      ),
    );
  }

  Widget _buildSection(BuildContext context, String title, List<Widget> children) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
          child: Text(
            title,
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  color: Theme.of(context).colorScheme.primary,
                  fontWeight: FontWeight.bold,
                ),
          ),
        ),
        ...children,
        const Divider(),
      ],
    );
  }

  Widget _buildLanguageTile(BuildContext context, AppSettings settings, SettingsNotifier notifier) {
    return ListTile(
      title: const Text('Language'),
      subtitle: Text(settings.language.displayName),
      trailing: const Icon(Icons.chevron_right),
      onTap: () => showDialog(
        context: context,
        builder: (ctx) => SimpleDialog(
          title: const Text('Select Language'),
          children: AppLanguage.values.map((lang) => SimpleDialogOption(
            onPressed: () {
              notifier.setLanguage(lang);
              Navigator.pop(ctx);
            },
            child: Text(lang.displayName),
          )).toList(),
        ),
      ),
    );
  }

  Widget _buildFontSizeTile(BuildContext context, AppSettings settings, SettingsNotifier notifier) {
    return ListTile(
      title: const Text('Font Size'),
      subtitle: Text(settings.fontSize.label),
      trailing: const Icon(Icons.chevron_right),
      onTap: () => showDialog(
        context: context,
        builder: (ctx) => SimpleDialog(
          title: const Text('Select Font Size'),
          children: FontSizeOption.values.map((size) => SimpleDialogOption(
            onPressed: () {
              notifier.setFontSize(size);
              Navigator.pop(ctx);
            },
            child: Text(size.label),
          )).toList(),
        ),
      ),
    );
  }

  void _exportData(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Exporting data...')),
    );
  }

  void _confirmDeleteData(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete All Data'),
        content: const Text('This action cannot be undone. Are you sure?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
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
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              ref.read(authProvider.notifier).logout();
            },
            child: const Text('Logout'),
          ),
        ],
      ),
    );
  }
}
