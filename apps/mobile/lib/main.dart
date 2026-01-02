import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'data/datasources/api_service.dart';
import 'services/notification_service.dart';
import 'presentation/pages/home_page.dart';
import 'presentation/pages/profile_setup_dialog.dart';
import 'presentation/providers/auth_provider.dart';
import 'presentation/providers/settings_provider.dart';
import 'presentation/themes/app_theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize API service
  await ApiService().init();
  
  // Initialize notification service
  await NotificationService().init();
  
  runApp(
    const ProviderScope(
      child: MedicationReminderApp(),
    ),
  );
}

class MedicationReminderApp extends ConsumerWidget {
  const MedicationReminderApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(settingsProvider);
    
    return MaterialApp(
      title: 'Medication Reminder',
      debugShowCheckedModeBanner: false,
      theme: settings.highContrast
          ? AppTheme.highContrastTheme(fontScale: settings.fontSize.scale)
          : AppTheme.lightTheme(fontScale: settings.fontSize.scale),
      home: const AppStartupWrapper(),
    );
  }
}

// Wrapper to handle first-time profile setup
class AppStartupWrapper extends ConsumerStatefulWidget {
  const AppStartupWrapper({super.key});

  @override
  ConsumerState<AppStartupWrapper> createState() => _AppStartupWrapperState();
}

class _AppStartupWrapperState extends ConsumerState<AppStartupWrapper> {
  bool _isLoading = true;
  bool _showProfileSetup = false;

  @override
  void initState() {
    super.initState();
    _checkFirstLaunch();
  }

  Future<void> _checkFirstLaunch() async {
    final prefs = await SharedPreferences.getInstance();
    final profileComplete = prefs.getBool('profile_setup_complete') ?? false;
    
    if (!profileComplete) {
      // First launch - show profile setup
      setState(() {
        _isLoading = false;
        _showProfileSetup = true;
      });
    } else {
      // Profile already set up - create anonymous user if needed
      final authNotifier = ref.read(authProvider.notifier);
      await authNotifier.createAnonymousUser();
      setState(() {
        _isLoading = false;
        _showProfileSetup = false;
      });
    }
  }

  void _onProfileSetupComplete() async {
    // Create anonymous user after profile setup
    final authNotifier = ref.read(authProvider.notifier);
    await authNotifier.createAnonymousUser();
    
    setState(() {
      _showProfileSetup = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    return Stack(
      children: [
        const HomePage(),
        if (_showProfileSetup)
          Container(
            color: Colors.black54,
            child: ProfileSetupDialog(
              onComplete: _onProfileSetupComplete,
            ),
          ),
      ],
    );
  }
}
