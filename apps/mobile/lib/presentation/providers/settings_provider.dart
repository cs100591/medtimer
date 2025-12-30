import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/constants/app_constants.dart';

// Settings state
class AppSettings {
  final AppLanguage language;
  final FontSizeOption fontSize;
  final bool highContrast;
  final bool voiceEnabled;
  final bool notificationsEnabled;

  const AppSettings({
    this.language = AppLanguage.en,
    this.fontSize = FontSizeOption.normal,
    this.highContrast = false,
    this.voiceEnabled = false,
    this.notificationsEnabled = true,
  });

  AppSettings copyWith({
    AppLanguage? language,
    FontSizeOption? fontSize,
    bool? highContrast,
    bool? voiceEnabled,
    bool? notificationsEnabled,
  }) {
    return AppSettings(
      language: language ?? this.language,
      fontSize: fontSize ?? this.fontSize,
      highContrast: highContrast ?? this.highContrast,
      voiceEnabled: voiceEnabled ?? this.voiceEnabled,
      notificationsEnabled: notificationsEnabled ?? this.notificationsEnabled,
    );
  }
}

// Settings notifier
class SettingsNotifier extends StateNotifier<AppSettings> {
  SettingsNotifier() : super(const AppSettings()) {
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    
    final languageCode = prefs.getString(AppConstants.languageKey) ?? 'en';
    final fontSizeIndex = prefs.getInt(AppConstants.fontSizeKey) ?? 1;
    final highContrast = prefs.getBool(AppConstants.highContrastKey) ?? false;
    
    state = AppSettings(
      language: AppLanguage.values.firstWhere(
        (l) => l.code == languageCode,
        orElse: () => AppLanguage.en,
      ),
      fontSize: FontSizeOption.values[fontSizeIndex.clamp(0, FontSizeOption.values.length - 1)],
      highContrast: highContrast,
    );
  }

  Future<void> setLanguage(AppLanguage language) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(AppConstants.languageKey, language.code);
    state = state.copyWith(language: language);
  }

  Future<void> setFontSize(FontSizeOption fontSize) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(AppConstants.fontSizeKey, fontSize.index);
    state = state.copyWith(fontSize: fontSize);
  }

  Future<void> setHighContrast(bool enabled) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(AppConstants.highContrastKey, enabled);
    state = state.copyWith(highContrast: enabled);
  }

  Future<void> setVoiceEnabled(bool enabled) async {
    state = state.copyWith(voiceEnabled: enabled);
  }

  Future<void> setNotificationsEnabled(bool enabled) async {
    state = state.copyWith(notificationsEnabled: enabled);
  }
}

final settingsProvider = StateNotifierProvider<SettingsNotifier, AppSettings>(
  (ref) => SettingsNotifier(),
);
