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
      // Initialize timezone database
      tz_data.initializeTimeZones();
      tz.setLocalLocation(tz.getLocation('Asia/Shanghai')); // Default to China timezone
      
      debugPrint('NotificationService: Timezone set to Asia/Shanghai');

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
      await _notifications.initialize(
        settings,
        onDidReceiveNotificationResponse: _onNotificationTapped,
      );
      
      debugPrint('NotificationService: Plugin initialized');

      // Create notification channel for Android
      await _createNotificationChannel();

      // Request permissions
      await _requestPermissions();

      _initialized = true;
      debugPrint('NotificationService: Initialization complete');
    } catch (e, st) {
      debugPrint('NotificationService: Error during initialization: $e');
      debugPrint('Stack trace: $st');
      _initialized = true;
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

  Future<void> _requestPermissions() async {
    try {
      final android = _notifications.resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>();
      if (android != null) {
        final notifPermission = await android.requestNotificationsPermission();
        debugPrint('NotificationService: Notification permission: $notifPermission');
        
        final exactAlarmPermission = await android.requestExactAlarmsPermission();
        debugPrint('NotificationService: Exact alarm permission: $exactAlarmPermission');
      }

      final ios = _notifications.resolvePlatformSpecificImplementation<
          IOSFlutterLocalNotificationsPlugin>();
      if (ios != null) {
        await ios.requestPermissions(alert: true, badge: true, sound: true);
      }
    } catch (e) {
      debugPrint('NotificationService: Error requesting permissions: $e');
    }
  }

  void _onNotificationTapped(NotificationResponse response) {
    debugPrint('NotificationService: Notification tapped: ${response.payload}');
  }

  // Show an immediate notification - this should always work
  Future<void> showTestNotification() async {
    if (!_initialized) await init();
    
    try {
      const androidDetails = AndroidNotificationDetails(
        _channelId,
        _channelName,
        channelDescription: _channelDesc,
        importance: Importance.max,
        priority: Priority.max,
        playSound: true,
        enableVibration: true,
        icon: '@mipmap/ic_launcher',
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
        DateTime.now().millisecondsSinceEpoch % 100000,
        '💊 Test Notification',
        'Push notifications are working! Time: ${DateTime.now()}',
        details,
      );
      
      debugPrint('NotificationService: Test notification shown');
    } catch (e) {
      debugPrint('NotificationService: Error showing test notification: $e');
    }
  }

  // Schedule a test notification for 10 seconds from now
  Future<void> scheduleTestNotification() async {
    if (!_initialized) await init();
    
    try {
      final now = tz.TZDateTime.now(tz.local);
      final scheduledTime = now.add(const Duration(seconds: 10));
      
      debugPrint('NotificationService: Current time: $now');
      debugPrint('NotificationService: Scheduling test for: $scheduledTime');
      
      const androidDetails = AndroidNotificationDetails(
        _channelId,
        _channelName,
        channelDescription: _channelDesc,
        importance: Importance.max,
        priority: Priority.max,
        playSound: true,
        enableVibration: true,
        icon: '@mipmap/ic_launcher',
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
        'This was scheduled 10 seconds ago!',
        scheduledTime,
        details,
        androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
        uiLocalNotificationDateInterpretation: UILocalNotificationDateInterpretation.absoluteTime,
      );
      
      debugPrint('NotificationService: Test notification scheduled successfully');
    } catch (e, st) {
      debugPrint('NotificationService: Error scheduling test: $e');
      debugPrint('Stack trace: $st');
    }
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
      final prefs = await SharedPreferences.getInstance();
      if (!(prefs.getBool('notifications_enabled') ?? true)) {
        return false;
      }

      final scheduledTime = _parseTimeString(time);
      if (scheduledTime == null) {
        debugPrint('NotificationService: Failed to parse time: $time');
        return false;
      }

      final scheduledDateTime = _nextInstanceOfTime(scheduledTime);
      
      debugPrint('NotificationService: Scheduling $medicationName at $scheduledDateTime');

      const androidDetails = AndroidNotificationDetails(
        _channelId,
        _channelName,
        channelDescription: _channelDesc,
        importance: Importance.max,
        priority: Priority.max,
        playSound: true,
        enableVibration: true,
        icon: '@mipmap/ic_launcher',
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
        id,
        '💊 Time for $medicationName',
        'Take $dosage now',
        scheduledDateTime,
        details,
        androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
        uiLocalNotificationDateInterpretation: UILocalNotificationDateInterpretation.absoluteTime,
        matchDateTimeComponents: DateTimeComponents.time,
        payload: 'medication_$id',
      );

      debugPrint('NotificationService: Scheduled notification $id');
      return true;
    } catch (e) {
      debugPrint('NotificationService: Error scheduling: $e');
      return false;
    }
  }

  TimeOfDay? _parseTimeString(String time) {
    final amPmMatch = RegExp(r'(\d{1,2}):(\d{2})\s*(AM|PM)?', caseSensitive: false).firstMatch(time);
    if (amPmMatch != null) {
      var hours = int.parse(amPmMatch.group(1)!);
      final minutes = int.parse(amPmMatch.group(2)!);
      final period = amPmMatch.group(3)?.toUpperCase();
      
      if (period == 'PM' && hours != 12) hours += 12;
      if (period == 'AM' && hours == 12) hours = 0;
      
      return TimeOfDay(hour: hours, minute: minutes);
    }
    
    final parts = time.split(':');
    if (parts.length >= 2) {
      final hours = int.tryParse(parts[0].trim());
      final minutes = int.tryParse(parts[1].trim().replaceAll(RegExp(r'[^0-9]'), ''));
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

  Future<void> cancelNotification(int id) async {
    try {
      await _notifications.cancel(id);
    } catch (e) {
      debugPrint('NotificationService: Error canceling: $e');
    }
  }

  Future<void> cancelAllNotifications() async {
    try {
      await _notifications.cancelAll();
    } catch (e) {
      debugPrint('NotificationService: Error canceling all: $e');
    }
  }

  Future<int> scheduleAllRemindersForMedication({
    required String medicationId,
    required String medicationName,
    required String dosage,
    required List<String> scheduleTimes,
  }) async {
    if (!_initialized) await init();
    
    final baseId = (medicationId.hashCode.abs() % 100000) + 10000;
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
    
    return successCount;
  }

  Future<bool> areNotificationsEnabled() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool('notifications_enabled') ?? true;
  }

  Future<void> setNotificationsEnabled(bool enabled) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('notifications_enabled', enabled);
    if (!enabled) await cancelAllNotifications();
  }

  Future<List<PendingNotificationRequest>> getPendingNotifications() async {
    try {
      return await _notifications.pendingNotificationRequests();
    } catch (e) {
      return [];
    }
  }

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
  }
}
