import 'package:flutter/material.dart';

class AppTheme {
  // Primary color constant
  static const Color primaryColor = Colors.blue;
  
  // Standard theme
  static ThemeData lightTheme({double fontScale = 1.0}) {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: Colors.blue,
        brightness: Brightness.light,
      ),
      textTheme: _buildTextTheme(fontScale, Colors.black87),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          minimumSize: const Size(88, 48),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
        ),
      ),
      inputDecorationTheme: const InputDecorationTheme(
        border: OutlineInputBorder(),
        contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      ),
    );
  }

  // High contrast theme for accessibility
  static ThemeData highContrastTheme({double fontScale = 1.0}) {
    return ThemeData(
      useMaterial3: true,
      colorScheme: const ColorScheme(
        brightness: Brightness.light,
        primary: Colors.black,
        onPrimary: Colors.white,
        secondary: Colors.blue,
        onSecondary: Colors.white,
        error: Colors.red,
        onError: Colors.white,
        surface: Colors.white,
        onSurface: Colors.black,
      ),
      textTheme: _buildTextTheme(fontScale, Colors.black),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          minimumSize: const Size(100, 56), // Larger buttons for accessibility
          padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
          textStyle: TextStyle(fontSize: 18 * fontScale, fontWeight: FontWeight.bold),
        ),
      ),
      iconTheme: const IconThemeData(size: 28),
      inputDecorationTheme: const InputDecorationTheme(
        border: OutlineInputBorder(
          borderSide: BorderSide(width: 2, color: Colors.black),
        ),
        focusedBorder: OutlineInputBorder(
          borderSide: BorderSide(width: 3, color: Colors.blue),
        ),
        contentPadding: EdgeInsets.symmetric(horizontal: 20, vertical: 20),
      ),
    );
  }

  static TextTheme _buildTextTheme(double scale, Color color) {
    return TextTheme(
      displayLarge: TextStyle(fontSize: 57 * scale, color: color),
      displayMedium: TextStyle(fontSize: 45 * scale, color: color),
      displaySmall: TextStyle(fontSize: 36 * scale, color: color),
      headlineLarge: TextStyle(fontSize: 32 * scale, color: color),
      headlineMedium: TextStyle(fontSize: 28 * scale, color: color),
      headlineSmall: TextStyle(fontSize: 24 * scale, color: color),
      titleLarge: TextStyle(fontSize: 22 * scale, color: color),
      titleMedium: TextStyle(fontSize: 16 * scale, color: color, fontWeight: FontWeight.w500),
      titleSmall: TextStyle(fontSize: 14 * scale, color: color, fontWeight: FontWeight.w500),
      bodyLarge: TextStyle(fontSize: 16 * scale, color: color),
      bodyMedium: TextStyle(fontSize: 14 * scale, color: color),
      bodySmall: TextStyle(fontSize: 12 * scale, color: color),
      labelLarge: TextStyle(fontSize: 14 * scale, color: color, fontWeight: FontWeight.w500),
      labelMedium: TextStyle(fontSize: 12 * scale, color: color),
      labelSmall: TextStyle(fontSize: 11 * scale, color: color),
    );
  }
}
