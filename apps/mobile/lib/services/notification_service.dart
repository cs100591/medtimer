import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/timezone.dart' as tz;
import 'package:timezone/data/latest.dart' as tz;
import 'package:shared_preferences/shared_preferences.dart';

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FlutterLocalNotificationsPlugin _notifications = FlutterLocalNotificationsPlugin();
  bool _initialized = false;

  Future<void> init() async {
    if (_initialized) return;

    tz.initializeTimeZones();

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
    debugPrint('NotificationService initialized');
  }

  Future<void> _requestPermissions() async {
    final android = _notifications.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();
    if (android != null) {
      // Request notification permission
      final granted = await android.requestNotificationsPermission();
      debugPrint('NotificationService: Notification permission granted: $granted');
      
      // Request exact alarm permission for scheduled notifications
      final exactAlarmGranted = await android.requestExactAlarmsPermission();
      debugPrint('NotificationService: Exact alarm permission granted: $exactAlarmGranted');
    }
  }

  void _onNotificationTapped(NotificationResponse response) {
    debugPrint('Notification tapped: ${response.payload}');
    // Handle notification tap - could navigate to specific medication
  }

  // Schedule a medication reminder
  Future<void> scheduleMedicationReminder({
    required int id,
    required String medicationName,
    required String dosage,
    required String time,
    required bool daily,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    final notificationsEnabled = prefs.getBool('notifications_enabled') ?? true;
    
    if (!notificationsEnabled) {
      debugPrint('Notifications disabled, skipping schedule');
      return;
    }

    // Parse time string (e.g., "8:00 AM" or "14:30")
    final scheduledTime = _parseTimeString(time);
    if (scheduledTime == null) {
      debugPrint('Failed to parse time: $time');
      return;
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

    if (daily) {
      // Schedule daily repeating notification
      await _notifications.zonedSchedule(
        id,
        '💊 Time for $medicationName',
        'Take $dosage',
        _nextInstanceOfTime(scheduledTime),
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
        _nextInstanceOfTime(scheduledTime),
        details,
        androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
        uiLocalNotificationDateInterpretation:
            UILocalNotificationDateInterpretation.absoluteTime,
        payload: 'medication_$id',
      );
    }

    debugPrint('Scheduled notification for $medicationName at $time');
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
    
    if (scheduledDate.isBefore(now)) {
      scheduledDate = scheduledDate.add(const Duration(days: 1));
    }
    
    return scheduledDate;
  }

  // Cancel a specific notification
  Future<void> cancelNotification(int id) async {
    await _notifications.cancel(id);
    debugPrint('Cancelled notification $id');
  }

  // Cancel all notifications
  Future<void> cancelAllNotifications() async {
    await _notifications.cancelAll();
    debugPrint('Cancelled all notifications');
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
  Future<void> scheduleAllRemindersForMedication({
    required String medicationId,
    required String medicationName,
    required String dosage,
    required List<String> scheduleTimes,
  }) async {
    debugPrint('NotificationService: Scheduling reminders for $medicationName');
    debugPrint('NotificationService: Schedule times: $scheduleTimes');
    
    // Cancel existing notifications for this medication
    final baseId = medicationId.hashCode.abs();
    for (var i = 0; i < 10; i++) {
      await cancelNotification(baseId + i);
    }

    // Schedule new notifications
    for (var i = 0; i < scheduleTimes.length; i++) {
      debugPrint('NotificationService: Scheduling notification ${baseId + i} for ${scheduleTimes[i]}');
      await scheduleMedicationReminder(
        id: baseId + i,
        medicationName: medicationName,
        dosage: dosage,
        time: scheduleTimes[i],
        daily: true,
      );
    }
    
    debugPrint('NotificationService: Scheduled ${scheduleTimes.length} notifications for $medicationName');
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
    return await _notifications.pendingNotificationRequests();
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
