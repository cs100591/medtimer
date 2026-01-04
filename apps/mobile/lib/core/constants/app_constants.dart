// App-wide constants
class AppConstants {
  static const String appName = 'MedTimer';
  
  // API URL - Production URL (deployed backend)
  // TODO: Replace with your deployed backend URL
  // For local development with Android emulator: http://10.0.2.2:3000/api/v1
  // For local development with real device on same network: http://YOUR_IP:3000/api/v1
  // For production: https://your-backend-domain.com/api/v1
  static const String apiBaseUrl = 'https://medcare-backend.onrender.com/api/v1';
  
  // Notification channels
  static const String reminderChannelId = 'medication_reminders';
  static const String emergencyChannelId = 'emergency_alerts';
  
  // Local storage keys
  static const String userTokenKey = 'user_token';
  static const String userIdKey = 'user_id';
  static const String languageKey = 'language';
  static const String themeKey = 'theme';
  static const String fontSizeKey = 'font_size';
  static const String highContrastKey = 'high_contrast';
  
  // Sync intervals
  static const Duration syncInterval = Duration(minutes: 5);
  static const Duration reminderCheckInterval = Duration(seconds: 30);
}

// Supported languages
enum AppLanguage {
  en('English', 'en'),
  es('Español', 'es'),
  zh('中文', 'zh'),
  hi('हिन्दी', 'hi'),
  ar('العربية', 'ar'),
  fr('Français', 'fr'),
  pt('Português', 'pt'),
  ru('Русский', 'ru'),
  ja('日本語', 'ja'),
  de('Deutsch', 'de');

  final String displayName;
  final String code;
  const AppLanguage(this.displayName, this.code);
}

// Font size options for accessibility
enum FontSizeOption {
  small(0.85, 'Small'),
  normal(1.0, 'Normal'),
  large(1.2, 'Large'),
  extraLarge(1.4, 'Extra Large');

  final double scale;
  final String label;
  const FontSizeOption(this.scale, this.label);
}
