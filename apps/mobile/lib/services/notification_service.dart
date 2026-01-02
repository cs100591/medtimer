import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/timezone.dart' as tz;
import 'package:timezone/data/latest.dart' as tz_data;
import 'package:shared_preferences/shared_preferences.dart';

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FlutterLocalNotificationsPlugin _notifications = FlutterLocalNotificationsPlugin();
  bool _initialized = false;

  Future<void> init() async {
    if (_initialized) return;

    try {
      // Initialize timezone database
      tz_data.initializeTimeZones();
      
      // Get device timezone from offset
      try {
        final timeZoneName = _getTimeZoneFromOffset();
        tz.setLocalLocation(tz.getLocation(timeZoneName));
        debugPrint('NotificationService: Timezone set to $timeZoneName');
      } catch (e) {
        debugPrint('NotificationService: Failed to get timezone, using UTC: $e');
        tz.setLocalLocation(tz.UTC);
      }

      // Clear any corrupted notification cache first
      await _clearNotificationCache();

      const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
      const iosSettings = DarwinInitializationSettings(
        requestAlertPermission: true,
        requestBadgePermission: true,
        requestSoundPermission: true,
      );

      const settings = InitializationSettings(
        android: androidSettings,
        iOS: iosSettings,
      );

      await _notifications.initialize(
        settings,
        onDidReceiveNotificationResponse: _onNotificationTapped,
      );

      // Request permissions on Android 13+
      await _requestPermissions();

      _initialized = true;
      debugPrint('NotificationService initialized successfully');
    } catch (e) {
      debugPrint('NotificationService: Error during initialization: $e');
      // Try to recover by clearing cache and retrying
      await _clearNotificationCache();
      _initialized = true;
    }
  }

  // Clear corrupted notification cache from SharedPreferences
  Future<void> _clearNotificationCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      // Remove flutter_local_notifications cached data
      final keys = prefs.getKeys().where((key) => 
        key.contains('flutter_local_notifications') ||
        key.contains('notification') && !key.contains('notifications_enabled')
      ).toList();
      
      for (final key in keys) {
        await prefs.remove(key);
        debugPrint('NotificationService: Cleared cache key: $key');
      }
    } catch (e) {
      debugPrint('NotificationService: Error clearing cache: $e');
    }
  }

  String _getTimeZoneFromOffset() {
    final now = DateTime.now();
    final offset = now.timeZoneOffset;
    final offsetHours = offset.inHours;
    final offsetMinutes = offset.inMinutes.abs() % 60;
    
    final timezoneMap = {
      8: 'Asia/Shanghai',
      9: 'Asia/Tokyo',
      7: 'Asia/Bangkok',
      5: 'Asia/Karachi',
      0: 'Europe/London',
      1: 'Europe/Paris',
      2: 'Europe/Helsinki',
      3: 'Europe/Moscow',
      4: 'Asia/Dubai',
      -5: 'America/New_York',
      -6: 'America/Chicago',
      -7: 'America/Denver',
      -8: 'America/Los_Angeles',
      -3: 'America/Sao_Paulo',
      10: 'Australia/Sydney',
      11: 'Pacific/Auckland',
    };
    
    if (offsetHours == 5 && offsetMinutes == 30) return 'Asia/Kolkata';
    if (offsetHours == 5 && offsetMinutes == 45) return 'Asia/Kathmandu';
    if (offsetHours == 9 && offsetMinutes == 30) return 'Australia/Darwin';
    
    return timezoneMap[offsetHours] ?? 'UTC';
  }

  Future<void> _requestPermissions() async {
    try {
      final android = _notifications.resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>();
      if (android != null) {
        await android.requestNotificationsPermission();
        await android.requestExactAlarmsPermission();
      }
    } catch (e) {
      debugPrint('NotificationService: Error requesting permissions: $e');
    }
  }

  void _onNotificationTapped(NotificationResponse response) {
    debugPrint('Notification tapped: ${response.payload}');
  }

  // Schedule a medication reminder - simplified version
  Future<bool> scheduleMedicationReminder({
    required int id,
    required String medicationName,
    required String dosage,
    required String time,
  }) async {
    if (!_initialized) await init();
    
    try {
      final prefs = await SharedPreferences.getInstance();
      if (!(prefs.getBool('notifications_enabled') ?? true)) {
        return false;
      }

      final scheduledTime = _parseTimeString(time);
      if (scheduledTime == null) {
        debugPrint('NotificationService: Failed to parse time: $time');
        return false;
      }

      const androidDetails = AndroidNotificationDetails(
        'medication_reminders',
        'Medication Reminders',
        channelDescription: 'Reminders to take your medications',
        importance: Importance.high,
        priority: Priority.high,
        icon: '@mipmap/ic_launcher',
      );

      const iosDetails = DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
      );

      const details = NotificationDetails(android: androidDetails, iOS: iosDetails);

      final scheduledDateTime = _nextInstanceOfTime(scheduledTime);

      await _notifications.zonedSchedule(
        id,
        '💊 Time for $medicationName',
        'Take $dosage',
        scheduledDateTime,
        details,
        androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
        uiLocalNotificationDateInterpretation: UILocalNotificationDateInterpretation.absoluteTime,
        matchDateTimeComponents: DateTimeComponents.time,
      );

      debugPrint('NotificationService: Scheduled notification $id for $medicationName at $scheduledDateTime');
      return true;
    } catch (e) {
      debugPrint('NotificationService: Error scheduling: $e');
      // If error occurs, try clearing cache and retry once
      await _clearNotificationCache();
      return false;
    }
  }

  TimeOfDay? _parseTimeString(String time) {
    final amPmMatch = RegExp(r'(\d+):(\d+)\s*(AM|PM)?', caseSensitive: false).firstMatch(time);
    if (amPmMatch != null) {
      var hours = int.parse(amPmMatch.group(1)!);
      final minutes = int.parse(amPmMatch.group(2)!);
      final period = amPmMatch.group(3)?.toUpperCase();
      
      if (period == 'PM' && hours != 12) hours += 12;
      if (period == 'AM' && hours == 12) hours = 0;
      
      return TimeOfDay(hour: hours, minute: minutes);
    }
    
    final parts = time.split(':');
    if (parts.length == 2) {
      final hours = int.tryParse(parts[0]);
      final minutes = int.tryParse(parts[1]);
      if (hours != null && minutes != null) {
        return TimeOfDay(hour: hours, minute: minutes);
      }
    }
    return null;
  }

  tz.TZDateTime _nextInstanceOfTime(TimeOfDay time) {
    final now = tz.TZDateTime.now(tz.local);
    var scheduledDate = tz.TZDateTime(tz.local, now.year, now.month, now.day, time.hour, time.minute);
    if (scheduledDate.isBefore(now)) {
      scheduledDate = scheduledDate.add(const Duration(days: 1));
    }
    return scheduledDate;
  }

  // Cancel notification - with error recovery
  Future<void> cancelNotification(int id) async {
    try {
      await _notifications.cancel(id);
    } catch (e) {
      debugPrint('NotificationService: Error canceling notification $id: $e');
      // Clear cache if cancel fails
      await _clearNotificationCache();
    }
  }

  // Cancel all notifications
  Future<void> cancelAllNotifications() async {
    try {
      await _notifications.cancelAll();
    } catch (e) {
      debugPrint('NotificationService: Error canceling all: $e');
      await _clearNotificationCache();
    }
  }

  // Show test notification
  Future<void> showTestNotification() async {
    if (!_initialized) await init();
    
    const androidDetails = AndroidNotificationDetails(
      'test_channel',
      'Test Notifications',
      channelDescription: 'Test notifications',
      importance: Importance.high,
      priority: Priority.high,
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    const details = NotificationDetails(android: androidDetails, iOS: iosDetails);

    await _notifications.show(0, '💊 Test Notification', 'Push notifications are working!', details);
  }

  // Schedule all reminders for a medication - NO CANCEL, just schedule new ones
  Future<int> scheduleAllRemindersForMedication({
    required String medicationId,
    required String medicationName,
    required String dosage,
    required List<String> scheduleTimes,
  }) async {
    if (!_initialized) await init();
    
    debugPrint('NotificationService: Scheduling ${scheduleTimes.length} reminders for $medicationName');
    
    // Use simple incrementing IDs based on medication hash
    final baseId = (medicationId.hashCode.abs() % 10000) + 1000;
    int successCount = 0;
    
    for (var i = 0; i < scheduleTimes.length; i++) {
      final success = await scheduleMedicationReminder(
        id: baseId + i,
        medicationName: medicationName,
        dosage: dosage,
        time: scheduleTimes[i],
      );
      if (success) successCount++;
    }
    
    debugPrint('NotificationService: Scheduled $successCount/${scheduleTimes.length} notifications');
    return successCount;
  }

  Future<bool> areNotificationsEnabled() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool('notifications_enabled') ?? true;
  }

  Future<void> setNotificationsEnabled(bool enabled) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('notifications_enabled', enabled);
    if (!enabled) {
      await cancelAllNotifications();
    }
  }

  Future<List<PendingNotificationRequest>> getPendingNotifications() async {
    try {
      return await _notifications.pendingNotificationRequests();
    } catch (e) {
      debugPrint('NotificationService: Error getting pending: $e');
      await _clearNotificationCache();
      return [];
    }
  }

  Future<void> showImmediateMedicationReminder({
    required String medicationName,
    required String dosage,
  }) async {
    if (!_initialized) await init();
    
    const androidDetails = AndroidNotificationDetails(
      'medication_reminders',
      'Medication Reminders',
      channelDescription: 'Reminders to take your medications',
      importance: Importance.high,
      priority: Priority.high,
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    const details = NotificationDetails(android: androidDetails, iOS: iosDetails);

    await _notifications.show(
      DateTime.now().millisecondsSinceEpoch ~/ 1000,
      '💊 Time for $medicationName',
      'Take $dosage',
      details,
    );
  }
}
