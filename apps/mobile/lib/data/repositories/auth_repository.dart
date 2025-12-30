import '../datasources/api_service.dart';
import '../models/user_model.dart';

class AuthRepository {
  final ApiService _api = ApiService();

  Future<void> init() async {
    await _api.init();
  }

  bool get isAuthenticated => _api.isAuthenticated;
  String? get userId => _api.userId;

  Future<UserModel> register({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    String? phone,
  }) async {
    final response = await _api.register(
      email: email,
      password: password,
      firstName: firstName,
      lastName: lastName,
      phone: phone,
    );
    final userData = response['data']?['user'] ?? response['user'];
    return UserModel.fromJson(userData);
  }

  Future<UserModel> login({
    required String email,
    required String password,
  }) async {
    final response = await _api.login(
      email: email,
      password: password,
    );
    final userData = response['data']?['user'] ?? response['user'];
    return UserModel.fromJson(userData);
  }

  Future<void> logout() async {
    await _api.logout();
  }

  Future<UserModel> getProfile() async {
    final response = await _api.getProfile();
    final userData = response['data'] ?? response;
    return UserModel.fromJson(userData);
  }

  Future<UserModel> updateProfile(Map<String, dynamic> updates) async {
    final response = await _api.updateProfile(updates);
    final userData = response['data'] ?? response;
    return UserModel.fromJson(userData);
  }
}
