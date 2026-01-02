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
  bool _permissionsGranted = false;

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
        // Fallback to UTC if timezone detection fails
        debugPrint('NotificationService: Failed to get timezone, using UTC: $e');
        tz.setLocalLocation(tz.UTC);
      }

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

      final initResult = await _notifications.initialize(
        settings,
        onDidReceiveNotificationResponse: _onNotificationTapped,
      );
      
      debugPrint('NotificationService: Initialize result: $initResult');

      // Request permissions on Android 13+
      _permissionsGranted = await _requestPermissions();

      _initialized = true;
      debugPrint('NotificationService initialized successfully, permissions: $_permissionsGranted');
    } catch (e) {
      debugPrint('NotificationService: Error during initialization: $e');
      _initialized = true; // Mark as initialized to prevent repeated attempts
    }
  }

  String _getTimeZoneFromOffset() {
    final now = DateTime.now();
    final offset = now.timeZoneOffset;
    final offsetHours = offset.inHours;
    final offsetMinutes = offset.inMinutes.abs() % 60;
    
    // Common timezone mappings based on UTC offset
    final timezoneMap = {
      8: 'Asia/Shanghai',      // China, Singapore, Hong Kong, Malaysia
      9: 'Asia/Tokyo',         // Japan, Korea
      7: 'Asia/Bangkok',       // Thailand, Vietnam, Indonesia
      5: 'Asia/Karachi',       // Pakistan
      0: 'Europe/London',      // UK, Portugal
      1: 'Europe/Paris',       // Central Europe
      2: 'Europe/Helsinki',    // Eastern Europe
      3: 'Europe/Moscow',      // Russia
      4: 'Asia/Dubai',         // UAE
      -5: 'America/New_York',  // US Eastern
      -6: 'America/Chicago',   // US Central
      -7: 'America/Denver',    // US Mountain
      -8: 'America/Los_Angeles', // US Pacific
      -3: 'America/Sao_Paulo', // Brazil
      10: 'Australia/Sydney',  // Australia Eastern
      11: 'Pacific/Auckland',  // New Zealand
    };
    
    // Handle India's 5:30 offset
    if (offsetHours == 5 && offsetMinutes == 30) {
      return 'Asia/Kolkata';
    }
    
    // Handle Nepal's 5:45 offset
    if (offsetHours == 5 && offsetMinutes == 45) {
      return 'Asia/Kathmandu';
    }
    
    // Handle Australia's 9:30 offset
    if (offsetHours == 9 && offsetMinutes == 30) {
      return 'Australia/Darwin';
    }
    
    return timezoneMap[offsetHours] ?? 'UTC';
  }

  Future<bool> _requestPermissions() async {
    try {
      final android = _notifications.resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>();
      if (android != null) {
        // Request notification permission
        final granted = await android.requestNotificationsPermission();
        debugPrint('NotificationService: Notification permission granted: $granted');
        
        // Request exact alarm permission for scheduled notifications
        final exactAlarmGranted = await android.requestExactAlarmsPermission();
        debugPrint('NotificationService: Exact alarm permission granted: $exactAlarmGranted');
        
        return granted == true;
      }
      return true; // iOS handles permissions differently
    } catch (e) {
      debugPrint('NotificationService: Error requesting permissions: $e');
      return false;
    }
  }

  void _onNotificationTapped(NotificationResponse response) {
    debugPrint('Notification tapped: ${response.payload}');
    // Handle notification tap - could navigate to specific medication
  }

  // Schedule a medication reminder
  Future<bool> scheduleMedicationReminder({
    required int id,
    required String medicationName,
    required String dosage,
    required String time,
    required bool daily,
  }) async {
    try {
      // Ensure initialized
      if (!_initialized) {
        await init();
      }
      
      final prefs = await SharedPreferences.getInstance();
      final notificationsEnabled = prefs.getBool('notifications_enabled') ?? true;
      
      if (!notificationsEnabled) {
        debugPrint('NotificationService: Notifications disabled, skipping schedule');
        return false;
      }

      // Parse time string (e.g., "8:00 AM" or "14:30")
      final scheduledTime = _parseTimeString(time);
      if (scheduledTime == null) {
        debugPrint('NotificationService: Failed to parse time: $time');
        return false;
      }

      final androidDetails = AndroidNotificationDetails(
        'medication_reminders',
        'Medication Reminders',
        channelDescription: 'Reminders to take your medications',
        importance: Importance.high,
        priority: Priority.high,
        icon: '@mipmap/ic_launcher',
        enableVibration: true,
        playSound: true,
        styleInformation: const BigTextStyleInformation(''),
      );

      const iosDetails = DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
      );

      final details = NotificationDetails(
        android: androidDetails,
        iOS: iosDetails,
      );

      final scheduledDateTime = _nextInstanceOfTime(scheduledTime);
      debugPrint('NotificationService: Scheduling notification $id for $medicationName at $scheduledDateTime');

      if (daily) {
        // Schedule daily repeating notification
        await _notifications.zonedSchedule(
          id,
          '💊 Time for $medicationName',
          'Take $dosage',
          scheduledDateTime,
          details,
          androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
          uiLocalNotificationDateInterpretation:
              UILocalNotificationDateInterpretation.absoluteTime,
          matchDateTimeComponents: DateTimeComponents.time,
          payload: 'medication_$id',
        );
      } else {
        // Schedule one-time notification
        await _notifications.zonedSchedule(
          id,
          '💊 Time for $medicationName',
          'Take $dosage',
          scheduledDateTime,
          details,
          androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
          uiLocalNotificationDateInterpretation:
              UILocalNotificationDateInterpretation.absoluteTime,
          payload: 'medication_$id',
        );
      }

      debugPrint('NotificationService: Successfully scheduled notification for $medicationName at $time (id: $id)');
      return true;
    } catch (e, stackTrace) {
      debugPrint('NotificationService: Error scheduling medication reminder: $e');
      debugPrint('NotificationService: Stack trace: $stackTrace');
      return false;
    }
  }

  TimeOfDay? _parseTimeString(String time) {
    // Try parsing "8:00 AM" format
    final amPmMatch = RegExp(r'(\d+):(\d+)\s*(AM|PM)?', caseSensitive: false).firstMatch(time);
    if (amPmMatch != null) {
      var hours = int.parse(amPmMatch.group(1)!);
      final minutes = int.parse(amPmMatch.group(2)!);
      final period = amPmMatch.group(3)?.toUpperCase();
      
      if (period == 'PM' && hours != 12) hours += 12;
      if (period == 'AM' && hours == 12) hours = 0;
      
      return TimeOfDay(hour: hours, minute: minutes);
    }
    
    // Try parsing "14:30" format
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
    var scheduledDate = tz.TZDateTime(
      tz.local,
      now.year,
      now.month,
      now.day,
      time.hour,
      time.minute,
    );
    
    // If the time has already passed today, schedule for tomorrow
    if (scheduledDate.isBefore(now)) {
      scheduledDate = scheduledDate.add(const Duration(days: 1));
    }
    
    debugPrint('NotificationService: Scheduling for ${scheduledDate.toString()} (now: ${now.toString()})');
    return scheduledDate;
  }

  // Cancel a specific notification
  Future<void> cancelNotification(int id) async {
    try {
      await _notifications.cancel(id);
      debugPrint('Cancelled notification $id');
    } catch (e) {
      // Ignore errors when canceling non-existent notifications
      debugPrint('Warning: Could not cancel notification $id: $e');
    }
  }

  // Cancel all notifications
  Future<void> cancelAllNotifications() async {
    try {
      await _notifications.cancelAll();
      debugPrint('Cancelled all notifications');
    } catch (e) {
      debugPrint('Warning: Could not cancel all notifications: $e');
    }
  }

  // Show immediate notification (for testing)
  Future<void> showTestNotification() async {
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

    const details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _notifications.show(
      0,
      '💊 Test Notification',
      'Push notifications are working!',
      details,
    );
  }

  // Schedule all reminders for a medication
  Future<int> scheduleAllRemindersForMedication({
    required String medicationId,
    required String medicationName,
    required String dosage,
    required List<String> scheduleTimes,
  }) async {
    debugPrint('NotificationService: Scheduling reminders for $medicationName');
    debugPrint('NotificationService: Schedule times: $scheduleTimes');
    
    // Ensure notification service is initialized
    if (!_initialized) {
      await init();
    }
    
    // Generate a stable base ID from medication ID
    final baseId = medicationId.hashCode.abs() % 100000; // Keep ID in reasonable range
    debugPrint('NotificationService: Base notification ID: $baseId');
    
    // Cancel existing notifications for this medication first
    for (var i = 0; i < 10; i++) {
      await cancelNotification(baseId + i);
    }

    // Schedule new notifications
    int successCount = 0;
    for (var i = 0; i < scheduleTimes.length; i++) {
      final notificationId = baseId + i;
      debugPrint('NotificationService: Scheduling notification $notificationId for ${scheduleTimes[i]}');
      
      final success = await scheduleMedicationReminder(
        id: notificationId,
        medicationName: medicationName,
        dosage: dosage,
        time: scheduleTimes[i],
        daily: true,
      );
      
      if (success) {
        successCount++;
      }
    }
    
    debugPrint('NotificationService: Scheduled $successCount/${scheduleTimes.length} notifications for $medicationName');
    
    // Verify scheduled notifications
    final pending = await getPendingNotifications();
    debugPrint('NotificationService: Total pending notifications: ${pending.length}');
    
    return successCount;
  }

  // Get notification settings
  Future<bool> areNotificationsEnabled() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool('notifications_enabled') ?? true;
  }

  // Set notification settings
  Future<void> setNotificationsEnabled(bool enabled) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('notifications_enabled', enabled);
    
    if (!enabled) {
      await cancelAllNotifications();
    }
  }

  // Get list of pending notifications (for debugging)
  Future<List<PendingNotificationRequest>> getPendingNotifications() async {
    try {
      return await _notifications.pendingNotificationRequests();
    } catch (e) {
      debugPrint('NotificationService: Error getting pending notifications: $e');
      return [];
    }
  }

  // Check if notification service is ready
  bool get isReady => _initialized && _permissionsGranted;
  
  // Get initialization status
  Map<String, dynamic> getStatus() {
    return {
      'initialized': _initialized,
      'permissionsGranted': _permissionsGranted,
    };
  }

  // Debug: Print all pending notifications
  Future<void> debugPrintPendingNotifications() async {
    final pending = await getPendingNotifications();
    debugPrint('=== Pending Notifications (${pending.length}) ===');
    for (final notification in pending) {
      debugPrint('  ID: ${notification.id}, Title: ${notification.title}, Body: ${notification.body}');
    }
    debugPrint('=== End Pending Notifications ===');
  }

  // Show immediate medication reminder (for testing a specific medication)
  Future<void> showImmediateMedicationReminder({
    required String medicationName,
    required String dosage,
  }) async {
    const androidDetails = AndroidNotificationDetails(
      'medication_reminders',
      'Medication Reminders',
      channelDescription: 'Reminders to take your medications',
      importance: Importance.high,
      priority: Priority.high,
      enableVibration: true,
      playSound: true,
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    const details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _notifications.show(
      DateTime.now().millisecondsSinceEpoch ~/ 1000,
      '💊 Time for $medicationName',
      'Take $dosage',
      details,
    );
  }
}
