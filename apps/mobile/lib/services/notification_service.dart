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

  // Notification channel constants
  static const String _channelId = 'medication_reminders';
  static const String _channelName = 'Medication Reminders';
  static const String _channelDesc = 'Reminders to take your medications';

  Future<void> init() async {
    if (_initialized) return;

    try {
      // Initialize timezone database FIRST
      tz_data.initializeTimeZones();
      
      // Set local timezone
      final timeZoneName = _getTimeZoneFromOffset();
      try {
        tz.setLocalLocation(tz.getLocation(timeZoneName));
        debugPrint('NotificationService: Timezone set to $timeZoneName');
      } catch (e) {
        debugPrint('NotificationService: Failed to set timezone $timeZoneName, using UTC: $e');
        tz.setLocalLocation(tz.UTC);
      }

      // Android initialization settings
      const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
      
      // iOS initialization settings
      const iosSettings = DarwinInitializationSettings(
        requestAlertPermission: true,
        requestBadgePermission: true,
        requestSoundPermission: true,
      );

      const settings = InitializationSettings(
        android: androidSettings,
        iOS: iosSettings,
      );

      // Initialize the plugin
      final initResult = await _notifications.initialize(
        settings,
        onDidReceiveNotificationResponse: _onNotificationTapped,
        onDidReceiveBackgroundNotificationResponse: _onBackgroundNotificationTapped,
      );
      
      debugPrint('NotificationService: Plugin initialized: $initResult');

      // Create notification channel for Android
      await _createNotificationChannel();

      // Request permissions
      await _requestPermissions();

      _initialized = true;
      debugPrint('NotificationService: Initialization complete');
    } catch (e, st) {
      debugPrint('NotificationService: Error during initialization: $e');
      debugPrint('Stack trace: $st');
      _initialized = true; // Mark as initialized to prevent infinite loops
    }
  }

  Future<void> _createNotificationChannel() async {
    final android = _notifications.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();
    
    if (android != null) {
      const channel = AndroidNotificationChannel(
        _channelId,
        _channelName,
        description: _channelDesc,
        importance: Importance.max,
        playSound: true,
        enableVibration: true,
        enableLights: true,
        ledColor: Color(0xFF007AFF),
      );
      
      await android.createNotificationChannel(channel);
      debugPrint('NotificationService: Notification channel created');
    }
  }

  String _getTimeZoneFromOffset() {
    final now = DateTime.now();
    final offset = now.timeZoneOffset;
    final offsetHours = offset.inHours;
    final offsetMinutes = offset.inMinutes.abs() % 60;
    
    // Common timezone mappings
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
    
    // Handle half-hour offsets
    if (offsetHours == 5 && offsetMinutes == 30) return 'Asia/Kolkata';
    if (offsetHours == 5 && offsetMinutes == 45) return 'Asia/Kathmandu';
    if (offsetHours == 9 && offsetMinutes == 30) return 'Australia/Darwin';
    
    return timezoneMap[offsetHours] ?? 'UTC';
  }

  Future<void> _requestPermissions() async {
    try {
      // Android permissions
      final android = _notifications.resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>();
      if (android != null) {
        final notifPermission = await android.requestNotificationsPermission();
        debugPrint('NotificationService: Notification permission: $notifPermission');
        
        final exactAlarmPermission = await android.requestExactAlarmsPermission();
        debugPrint('NotificationService: Exact alarm permission: $exactAlarmPermission');
      }

      // iOS permissions
      final ios = _notifications.resolvePlatformSpecificImplementation<
          IOSFlutterLocalNotificationsPlugin>();
      if (ios != null) {
        await ios.requestPermissions(
          alert: true,
          badge: true,
          sound: true,
        );
      }
    } catch (e) {
      debugPrint('NotificationService: Error requesting permissions: $e');
    }
  }

  void _onNotificationTapped(NotificationResponse response) {
    debugPrint('NotificationService: Notification tapped: ${response.payload}');
  }

  @pragma('vm:entry-point')
  static void _onBackgroundNotificationTapped(NotificationResponse response) {
    debugPrint('NotificationService: Background notification tapped: ${response.payload}');
  }

  // Schedule a medication reminder
  Future<bool> scheduleMedicationReminder({
    required int id,
    required String medicationName,
    required String dosage,
    required String time,
  }) async {
    if (!_initialized) await init();
    
    try {
      // Check if notifications are enabled
      final prefs = await SharedPreferences.getInstance();
      if (!(prefs.getBool('notifications_enabled') ?? true)) {
        debugPrint('NotificationService: Notifications disabled by user');
        return false;
      }

      // Parse the time string
      final scheduledTime = _parseTimeString(time);
      if (scheduledTime == null) {
        debugPrint('NotificationService: Failed to parse time: $time');
        return false;
      }

      // Calculate the next scheduled datetime
      final scheduledDateTime = _nextInstanceOfTime(scheduledTime);
      
      debugPrint('NotificationService: Scheduling notification $id');
      debugPrint('  Medication: $medicationName');
      debugPrint('  Time string: $time');
      debugPrint('  Parsed time: ${scheduledTime.hour}:${scheduledTime.minute}');
      debugPrint('  Scheduled for: $scheduledDateTime');
      debugPrint('  Current time: ${tz.TZDateTime.now(tz.local)}');

      // Android notification details with high priority
      const androidDetails = AndroidNotificationDetails(
        _channelId,
        _channelName,
        channelDescription: _channelDesc,
        importance: Importance.max,
        priority: Priority.max,
        icon: '@mipmap/ic_launcher',
        playSound: true,
        enableVibration: true,
        fullScreenIntent: true,
        category: AndroidNotificationCategory.alarm,
        visibility: NotificationVisibility.public,
        autoCancel: true,
      );

      // iOS notification details
      const iosDetails = DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
        interruptionLevel: InterruptionLevel.timeSensitive,
      );

      const details = NotificationDetails(
        android: androidDetails,
        iOS: iosDetails,
      );

      // Schedule the notification
      await _notifications.zonedSchedule(
        id,
        '💊 Time for $medicationName',
        'Take $dosage now',
        scheduledDateTime,
        details,
        androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
        uiLocalNotificationDateInterpretation: UILocalNotificationDateInterpretation.absoluteTime,
        matchDateTimeComponents: DateTimeComponents.time, // Repeat daily at this time
        payload: 'medication_$id',
      );

      debugPrint('NotificationService: Successfully scheduled notification $id for $scheduledDateTime');
      return true;
    } catch (e, st) {
      debugPrint('NotificationService: Error scheduling notification: $e');
      debugPrint('Stack trace: $st');
      return false;
    }
  }

  TimeOfDay? _parseTimeString(String time) {
    // Try to parse AM/PM format first (e.g., "8:00 AM", "2:30 PM")
    final amPmMatch = RegExp(r'(\d{1,2}):(\d{2})\s*(AM|PM)?', caseSensitive: false).firstMatch(time);
    if (amPmMatch != null) {
      var hours = int.parse(amPmMatch.group(1)!);
      final minutes = int.parse(amPmMatch.group(2)!);
      final period = amPmMatch.group(3)?.toUpperCase();
      
      if (period == 'PM' && hours != 12) hours += 12;
      if (period == 'AM' && hours == 12) hours = 0;
      
      return TimeOfDay(hour: hours, minute: minutes);
    }
    
    // Try 24-hour format (e.g., "14:30")
    final parts = time.split(':');
    if (parts.length >= 2) {
      final hours = int.tryParse(parts[0].trim());
      final minutes = int.tryParse(parts[1].trim().replaceAll(RegExp(r'[^0-9]'), ''));
      if (hours != null && minutes != null && hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
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
    
    return scheduledDate;
  }

  // Cancel a specific notification
  Future<void> cancelNotification(int id) async {
    try {
      await _notifications.cancel(id);
      debugPrint('NotificationService: Cancelled notification $id');
    } catch (e) {
      debugPrint('NotificationService: Error canceling notification $id: $e');
    }
  }

  // Cancel all notifications
  Future<void> cancelAllNotifications() async {
    try {
      await _notifications.cancelAll();
      debugPrint('NotificationService: Cancelled all notifications');
    } catch (e) {
      debugPrint('NotificationService: Error canceling all notifications: $e');
    }
  }

  // Show an immediate test notification
  Future<void> showTestNotification() async {
    if (!_initialized) await init();
    
    const androidDetails = AndroidNotificationDetails(
      'test_channel',
      'Test Notifications',
      channelDescription: 'Test notifications',
      importance: Importance.max,
      priority: Priority.max,
      playSound: true,
      enableVibration: true,
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
    
    debugPrint('NotificationService: Test notification shown');
  }

  // Schedule a test notification for 10 seconds from now
  Future<void> scheduleTestNotification() async {
    if (!_initialized) await init();
    
    final scheduledTime = tz.TZDateTime.now(tz.local).add(const Duration(seconds: 10));
    
    const androidDetails = AndroidNotificationDetails(
      _channelId,
      _channelName,
      channelDescription: _channelDesc,
      importance: Importance.max,
      priority: Priority.max,
      playSound: true,
      enableVibration: true,
      fullScreenIntent: true,
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

    await _notifications.zonedSchedule(
      99999,
      '💊 Scheduled Test',
      'This notification was scheduled 10 seconds ago!',
      scheduledTime,
      details,
      androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
      uiLocalNotificationDateInterpretation: UILocalNotificationDateInterpretation.absoluteTime,
    );
    
    debugPrint('NotificationService: Test notification scheduled for $scheduledTime');
  }

  // Schedule all reminders for a medication
  Future<int> scheduleAllRemindersForMedication({
    required String medicationId,
    required String medicationName,
    required String dosage,
    required List<String> scheduleTimes,
  }) async {
    if (!_initialized) await init();
    
    debugPrint('NotificationService: Scheduling ${scheduleTimes.length} reminders for $medicationName');
    debugPrint('NotificationService: Schedule times: $scheduleTimes');
    
    // Generate unique IDs based on medication hash
    final baseId = (medicationId.hashCode.abs() % 100000) + 10000;
    int successCount = 0;
    
    for (var i = 0; i < scheduleTimes.length; i++) {
      final notificationId = baseId + i;
      
      // Cancel existing notification with this ID first
      await cancelNotification(notificationId);
      
      final success = await scheduleMedicationReminder(
        id: notificationId,
        medicationName: medicationName,
        dosage: dosage,
        time: scheduleTimes[i],
      );
      
      if (success) successCount++;
    }
    
    debugPrint('NotificationService: Scheduled $successCount/${scheduleTimes.length} notifications for $medicationName');
    return successCount;
  }

  // Check if notifications are enabled
  Future<bool> areNotificationsEnabled() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool('notifications_enabled') ?? true;
  }

  // Enable or disable notifications
  Future<void> setNotificationsEnabled(bool enabled) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('notifications_enabled', enabled);
    
    if (!enabled) {
      await cancelAllNotifications();
    }
    
    debugPrint('NotificationService: Notifications ${enabled ? 'enabled' : 'disabled'}');
  }

  // Get list of pending notifications
  Future<List<PendingNotificationRequest>> getPendingNotifications() async {
    try {
      final pending = await _notifications.pendingNotificationRequests();
      debugPrint('NotificationService: ${pending.length} pending notifications');
      for (final n in pending) {
        debugPrint('  - ID: ${n.id}, Title: ${n.title}');
      }
      return pending;
    } catch (e) {
      debugPrint('NotificationService: Error getting pending notifications: $e');
      return [];
    }
  }

  // Show immediate medication reminder
  Future<void> showImmediateMedicationReminder({
    required String medicationName,
    required String dosage,
  }) async {
    if (!_initialized) await init();
    
    const androidDetails = AndroidNotificationDetails(
      _channelId,
      _channelName,
      channelDescription: _channelDesc,
      importance: Importance.max,
      priority: Priority.max,
      playSound: true,
      enableVibration: true,
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
      'Take $dosage now',
      details,
    );
    
    debugPrint('NotificationService: Immediate reminder shown for $medicationName');
  }
}
