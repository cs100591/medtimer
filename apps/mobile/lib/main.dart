import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'data/datasources/api_service.dart';
import 'presentation/pages/home_page.dart';
import 'presentation/pages/login_page.dart';
import 'presentation/providers/auth_provider.dart';
import 'presentation/providers/settings_provider.dart';
import 'presentation/themes/app_theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize API service
  await ApiService().init();
  
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
    final authState = ref.watch(authProvider);
    
    return MaterialApp(
      title: 'Medication Reminder',
      debugShowCheckedModeBanner: false,
      theme: settings.highContrast
          ? AppTheme.highContrastTheme(fontScale: settings.fontSize.scale)
          : AppTheme.lightTheme(fontScale: settings.fontSize.scale),
      home: _buildHome(authState),
    );
  }

  Widget _buildHome(AuthState authState) {
    switch (authState.status) {
      case AuthStatus.initial:
      case AuthStatus.loading:
        return const Scaffold(
          body: Center(
            child: CircularProgressIndicator(),
          ),
        );
      case AuthStatus.authenticated:
        return const HomePage();
      case AuthStatus.unauthenticated:
        return const LoginPage();
    }
  }
}
