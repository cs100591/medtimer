import 'dart:convert';
import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/constants/app_constants.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  String? _authToken;
  String? _userId;
  bool _isOfflineMode = false;

  // Initialize with stored credentials
  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _authToken = prefs.getString(AppConstants.userTokenKey);
    _userId = prefs.getString(AppConstants.userIdKey);
    debugPrint('ApiService initialized. Authenticated: $isAuthenticated');
  }

  String? get userId => _userId;
  bool get isAuthenticated => _authToken != null;
  bool get isOfflineMode => _isOfflineMode;

  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    if (_authToken != null) 'Authorization': 'Bearer $_authToken',
  };

  // Auth endpoints
  Future<Map<String, dynamic>> register({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    String? phone,
    String? dateOfBirth,
  }) async {
    debugPrint('Registering user: $email');
    try {
      final response = await http.post(
        Uri.parse('${AppConstants.apiBaseUrl}/auth/register'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': email,
          'password': password,
          'firstName': firstName,
          'lastName': lastName,
          'phone': phone,
          'dateOfBirth': dateOfBirth,
        }),
      ).timeout(const Duration(seconds: 15));
      
      debugPrint('Register response: ${response.statusCode}');
      final data = _handleResponse(response);
      
      // Store token and user ID from response
      final tokens = data['data']?['tokens'];
      final user = data['data']?['user'];
      if (tokens != null && tokens['accessToken'] != null) {
        _authToken = tokens['accessToken'];
        _userId = user?['id'];
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(AppConstants.userTokenKey, _authToken!);
        if (_userId != null) {
          await prefs.setString(AppConstants.userIdKey, _userId!);
        }
        debugPrint('Registration successful. Token stored.');
      }
      _isOfflineMode = false;
      return data;
    } on TimeoutException {
      debugPrint('Register timeout - enabling offline mode');
      return _enableOfflineMode(email, firstName, lastName);
    } on http.ClientException catch (e) {
      debugPrint('Register network error: $e - enabling offline mode');
      return _enableOfflineMode(email, firstName, lastName);
    } catch (e) {
      debugPrint('Register error: $e');
      if (e.toString().contains('SocketException') || 
          e.toString().contains('Connection refused') ||
          e.toString().contains('Network is unreachable')) {
        return _enableOfflineMode(email, firstName, lastName);
      }
      rethrow;
    }
  }

  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    debugPrint('Logging in user: $email to ${AppConstants.apiBaseUrl}/auth/login');
    try {
      final response = await http.post(
        Uri.parse('${AppConstants.apiBaseUrl}/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': email,
          'password': password,
        }),
      ).timeout(const Duration(seconds: 15));
      
      debugPrint('Login response: ${response.statusCode}');
      final data = _handleResponse(response);
      
      // Store token and user ID from response
      final tokens = data['data']?['tokens'];
      final user = data['data']?['user'];
      if (tokens != null && tokens['accessToken'] != null) {
        _authToken = tokens['accessToken'];
        _userId = user?['id'];
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(AppConstants.userTokenKey, _authToken!);
        if (_userId != null) {
          await prefs.setString(AppConstants.userIdKey, _userId!);
        }
        debugPrint('Login successful. Token stored.');
      }
      _isOfflineMode = false;
      return data;
    } on TimeoutException {
      debugPrint('Login timeout - enabling offline mode');
      return _enableOfflineMode(email, null, null);
    } on http.ClientException catch (e) {
      debugPrint('Login network error: $e - enabling offline mode');
      return _enableOfflineMode(email, null, null);
    } catch (e) {
      debugPrint('Login error: $e');
      if (e.toString().contains('SocketException') || 
          e.toString().contains('Connection refused') ||
          e.toString().contains('Network is unreachable')) {
        return _enableOfflineMode(email, null, null);
      }
      rethrow;
    }
  }

  // Enable offline mode with local user
  Future<Map<String, dynamic>> _enableOfflineMode(String email, String? firstName, String? lastName) async {
    _isOfflineMode = true;
    _authToken = 'offline_token_${DateTime.now().millisecondsSinceEpoch}';
    _userId = 'offline_user_${email.hashCode}';
    
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(AppConstants.userTokenKey, _authToken!);
    await prefs.setString(AppConstants.userIdKey, _userId!);
    
    // Store offline user data
    await prefs.setString('offline_user_email', email);
    if (firstName != null) await prefs.setString('offline_user_firstName', firstName);
    if (lastName != null) await prefs.setString('offline_user_lastName', lastName);
    
    debugPrint('Offline mode enabled for user: $email');
    
    return {
      'success': true,
      'offline': true,
      'data': {
        'user': {
          'id': _userId,
          'email': email,
          'firstName': firstName ?? email.split('@').first,
          'lastName': lastName ?? '',
          'isVerified': false,
          'createdAt': DateTime.now().toIso8601String(),
        },
        'tokens': {
          'accessToken': _authToken,
        },
      },
    };
  }

  Future<void> logout() async {
    _authToken = null;
    _userId = null;
    _isOfflineMode = false;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(AppConstants.userTokenKey);
    await prefs.remove(AppConstants.userIdKey);
    await prefs.remove('offline_user_email');
    await prefs.remove('offline_user_firstName');
    await prefs.remove('offline_user_lastName');
    debugPrint('Logged out');
  }

  // Medication endpoints
  Future<List<dynamic>> getMedications() async {
    if (_isOfflineMode) return _getOfflineMedications();
    try {
      final response = await http.get(
        Uri.parse('${AppConstants.apiBaseUrl}/medications'),
        headers: _headers,
      ).timeout(const Duration(seconds: 15));
      final data = _handleResponse(response);
      return data['medications'] ?? data['data'] ?? [];
    } catch (e) {
      debugPrint('getMedications error: $e');
      return _getOfflineMedications();
    }
  }

  Future<List<dynamic>> _getOfflineMedications() async {
    final prefs = await SharedPreferences.getInstance();
    final medsJson = prefs.getString('offline_medications') ?? '[]';
    return jsonDecode(medsJson) as List<dynamic>;
  }

  Future<Map<String, dynamic>> getMedication(String id) async {
    final response = await http.get(
      Uri.parse('${AppConstants.apiBaseUrl}/medications/$id'),
      headers: _headers,
    ).timeout(const Duration(seconds: 15));
    return _handleResponse(response);
  }

  Future<Map<String, dynamic>> createMedication(Map<String, dynamic> medication) async {
    if (_isOfflineMode) return _createOfflineMedication(medication);
    try {
      final response = await http.post(
        Uri.parse('${AppConstants.apiBaseUrl}/medications'),
        headers: _headers,
        body: jsonEncode(medication),
      ).timeout(const Duration(seconds: 15));
      return _handleResponse(response);
    } catch (e) {
      debugPrint('createMedication error: $e');
      return _createOfflineMedication(medication);
    }
  }

  Future<Map<String, dynamic>> _createOfflineMedication(Map<String, dynamic> medication) async {
    final prefs = await SharedPreferences.getInstance();
    final medsJson = prefs.getString('offline_medications') ?? '[]';
    final meds = jsonDecode(medsJson) as List<dynamic>;
    
    final newMed = {
      ...medication,
      'id': 'offline_med_${DateTime.now().millisecondsSinceEpoch}',
      'createdAt': DateTime.now().toIso8601String(),
      'updatedAt': DateTime.now().toIso8601String(),
    };
    meds.add(newMed);
    
    await prefs.setString('offline_medications', jsonEncode(meds));
    return {'success': true, 'data': newMed};
  }

  Future<Map<String, dynamic>> updateMedication(String id, Map<String, dynamic> medication) async {
    final response = await http.put(
      Uri.parse('${AppConstants.apiBaseUrl}/medications/$id'),
      headers: _headers,
      body: jsonEncode(medication),
    ).timeout(const Duration(seconds: 15));
    return _handleResponse(response);
  }

  Future<void> deleteMedication(String id) async {
    if (_isOfflineMode) {
      await _deleteOfflineMedication(id);
      return;
    }
    final response = await http.delete(
      Uri.parse('${AppConstants.apiBaseUrl}/medications/$id'),
      headers: _headers,
    ).timeout(const Duration(seconds: 15));
    _handleResponse(response);
  }

  Future<void> _deleteOfflineMedication(String id) async {
    final prefs = await SharedPreferences.getInstance();
    final medsJson = prefs.getString('offline_medications') ?? '[]';
    final meds = (jsonDecode(medsJson) as List<dynamic>)
        .where((m) => m['id'] != id)
        .toList();
    await prefs.setString('offline_medications', jsonEncode(meds));
  }

  // Schedule endpoints
  Future<List<dynamic>> getSchedules(String medicationId) async {
    try {
      final response = await http.get(
        Uri.parse('${AppConstants.apiBaseUrl}/schedules?medicationId=$medicationId'),
        headers: _headers,
      ).timeout(const Duration(seconds: 15));
      final data = _handleResponse(response);
      return data['schedules'] ?? data['data'] ?? [];
    } catch (e) {
      return [];
    }
  }

  Future<Map<String, dynamic>> createSchedule(Map<String, dynamic> schedule) async {
    final response = await http.post(
      Uri.parse('${AppConstants.apiBaseUrl}/schedules'),
      headers: _headers,
      body: jsonEncode(schedule),
    ).timeout(const Duration(seconds: 15));
    return _handleResponse(response);
  }

  Future<Map<String, dynamic>> updateSchedule(String id, Map<String, dynamic> schedule) async {
    final response = await http.put(
      Uri.parse('${AppConstants.apiBaseUrl}/schedules/$id'),
      headers: _headers,
      body: jsonEncode(schedule),
    ).timeout(const Duration(seconds: 15));
    return _handleResponse(response);
  }

  Future<void> deleteSchedule(String id) async {
    final response = await http.delete(
      Uri.parse('${AppConstants.apiBaseUrl}/schedules/$id'),
      headers: _headers,
    ).timeout(const Duration(seconds: 15));
    _handleResponse(response);
  }

  // Adherence endpoints
  Future<List<dynamic>> getAdherenceRecords({
    String? medicationId,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      final params = <String, String>{};
      if (medicationId != null) params['medicationId'] = medicationId;
      if (startDate != null) params['startDate'] = startDate.toIso8601String();
      if (endDate != null) params['endDate'] = endDate.toIso8601String();
      
      final uri = Uri.parse('${AppConstants.apiBaseUrl}/adherence')
          .replace(queryParameters: params.isNotEmpty ? params : null);
      
      final response = await http.get(uri, headers: _headers).timeout(const Duration(seconds: 15));
      final data = _handleResponse(response);
      return data['records'] ?? data['data'] ?? [];
    } catch (e) {
      return [];
    }
  }

  Future<Map<String, dynamic>> recordAdherence(Map<String, dynamic> record) async {
    final response = await http.post(
      Uri.parse('${AppConstants.apiBaseUrl}/adherence'),
      headers: _headers,
      body: jsonEncode(record),
    ).timeout(const Duration(seconds: 15));
    return _handleResponse(response);
  }

  Future<Map<String, dynamic>> updateAdherence(String id, Map<String, dynamic> record) async {
    final response = await http.put(
      Uri.parse('${AppConstants.apiBaseUrl}/adherence/$id'),
      headers: _headers,
      body: jsonEncode(record),
    ).timeout(const Duration(seconds: 15));
    return _handleResponse(response);
  }

  Future<Map<String, dynamic>> getAdherenceStats({
    String? medicationId,
    int days = 30,
  }) async {
    try {
      final params = <String, String>{'days': days.toString()};
      if (medicationId != null) params['medicationId'] = medicationId;
      
      final uri = Uri.parse('${AppConstants.apiBaseUrl}/adherence/stats')
          .replace(queryParameters: params);
      
      final response = await http.get(uri, headers: _headers).timeout(const Duration(seconds: 15));
      return _handleResponse(response);
    } catch (e) {
      return {'adherenceRate': 0, 'totalDoses': 0, 'takenDoses': 0};
    }
  }

  // Reminder endpoints
  Future<List<dynamic>> getTodayReminders() async {
    try {
      final response = await http.get(
        Uri.parse('${AppConstants.apiBaseUrl}/reminders/today'),
        headers: _headers,
      ).timeout(const Duration(seconds: 15));
      final data = _handleResponse(response);
      return data['reminders'] ?? data['data'] ?? [];
    } catch (e) {
      return [];
    }
  }

  Future<List<dynamic>> getUpcomingReminders({int hours = 24}) async {
    try {
      final response = await http.get(
        Uri.parse('${AppConstants.apiBaseUrl}/reminders/upcoming?hours=$hours'),
        headers: _headers,
      ).timeout(const Duration(seconds: 15));
      final data = _handleResponse(response);
      return data['reminders'] ?? data['data'] ?? [];
    } catch (e) {
      return [];
    }
  }

  // Supply tracking
  Future<Map<String, dynamic>> updateSupply(String medicationId, int quantity) async {
    final response = await http.put(
      Uri.parse('${AppConstants.apiBaseUrl}/medications/$medicationId/supply'),
      headers: _headers,
      body: jsonEncode({'currentSupply': quantity}),
    ).timeout(const Duration(seconds: 15));
    return _handleResponse(response);
  }

  Future<List<dynamic>> getLowSupplyMedications() async {
    try {
      final response = await http.get(
        Uri.parse('${AppConstants.apiBaseUrl}/medications/low-supply'),
        headers: _headers,
      ).timeout(const Duration(seconds: 15));
      final data = _handleResponse(response);
      return data['medications'] ?? data['data'] ?? [];
    } catch (e) {
      return [];
    }
  }

  // Drug interactions
  Future<List<dynamic>> checkInteractions(List<String> medicationIds) async {
    try {
      final response = await http.post(
        Uri.parse('${AppConstants.apiBaseUrl}/interactions/check'),
        headers: _headers,
        body: jsonEncode({'medicationIds': medicationIds}),
      ).timeout(const Duration(seconds: 15));
      final data = _handleResponse(response);
      return data['interactions'] ?? data['data'] ?? [];
    } catch (e) {
      return [];
    }
  }

  // User profile
  Future<Map<String, dynamic>> getProfile() async {
    if (_isOfflineMode) return _getOfflineProfile();
    try {
      final response = await http.get(
        Uri.parse('${AppConstants.apiBaseUrl}/auth/profile'),
        headers: _headers,
      ).timeout(const Duration(seconds: 15));
      return _handleResponse(response);
    } catch (e) {
      debugPrint('getProfile error: $e');
      return _getOfflineProfile();
    }
  }

  Future<Map<String, dynamic>> _getOfflineProfile() async {
    final prefs = await SharedPreferences.getInstance();
    return {
      'success': true,
      'data': {
        'id': _userId,
        'email': prefs.getString('offline_user_email') ?? 'offline@user.com',
        'firstName': prefs.getString('offline_user_firstName') ?? 'Offline',
        'lastName': prefs.getString('offline_user_lastName') ?? 'User',
        'isVerified': false,
        'language': 'en',
        'timezone': 'UTC',
      },
    };
  }

  Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> profile) async {
    final response = await http.put(
      Uri.parse('${AppConstants.apiBaseUrl}/auth/profile'),
      headers: _headers,
      body: jsonEncode(profile),
    ).timeout(const Duration(seconds: 15));
    return _handleResponse(response);
  }

  // Helper method to handle responses
  Map<String, dynamic> _handleResponse(http.Response response) {
    debugPrint('Response status: ${response.statusCode}');
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (response.body.isEmpty) return {};
      return jsonDecode(response.body);
    } else if (response.statusCode == 401) {
      throw ApiException('Unauthorized. Please login again.', response.statusCode);
    } else if (response.statusCode == 404) {
      throw ApiException('Resource not found.', response.statusCode);
    } else {
      final body = response.body.isNotEmpty ? jsonDecode(response.body) : {};
      final message = body['message'] ?? body['error']?['message'] ?? body['error'] ?? 'An error occurred';
      throw ApiException(message.toString(), response.statusCode);
    }
  }
}

class ApiException implements Exception {
  final String message;
  final int statusCode;

  ApiException(this.message, this.statusCode);

  @override
  String toString() => message;
}
