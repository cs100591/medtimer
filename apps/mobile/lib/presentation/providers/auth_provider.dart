import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../data/models/user_model.dart';
import '../../data/repositories/auth_repository.dart';
import '../../data/datasources/api_service.dart';
import '../../core/constants/app_constants.dart';

// Auth repository provider
final authRepositoryProvider = Provider((ref) => AuthRepository());

// Auth state
enum AuthStatus { initial, authenticated, unauthenticated, loading }

class AuthState {
  final AuthStatus status;
  final UserModel? user;
  final String? error;

  AuthState({
    this.status = AuthStatus.initial,
    this.user,
    this.error,
  });

  AuthState copyWith({
    AuthStatus? status,
    UserModel? user,
    String? error,
  }) {
    return AuthState(
      status: status ?? this.status,
      user: user ?? this.user,
      error: error,
    );
  }
}

// Auth notifier
class AuthNotifier extends StateNotifier<AuthState> {
  final AuthRepository _repository;

  AuthNotifier(this._repository) : super(AuthState()) {
    _init();
  }

  Future<void> _init() async {
    debugPrint('AuthNotifier: Initializing...');
    state = state.copyWith(status: AuthStatus.loading);
    try {
      await _repository.init();
      if (_repository.isAuthenticated) {
        debugPrint('AuthNotifier: User is authenticated, fetching profile...');
        try {
          final user = await _repository.getProfile();
          state = AuthState(status: AuthStatus.authenticated, user: user);
          debugPrint('AuthNotifier: Profile loaded successfully');
        } catch (e) {
          debugPrint('AuthNotifier: Failed to get profile: $e');
          // Try to load from local storage
          final localUser = await _loadLocalUser();
          if (localUser != null) {
            state = AuthState(status: AuthStatus.authenticated, user: localUser);
          } else {
            await _repository.logout();
            state = AuthState(status: AuthStatus.unauthenticated);
          }
        }
      } else {
        debugPrint('AuthNotifier: User is not authenticated');
        state = AuthState(status: AuthStatus.unauthenticated);
      }
    } catch (e) {
      debugPrint('AuthNotifier: Init error: $e');
      state = AuthState(status: AuthStatus.unauthenticated);
    }
  }

  Future<UserModel?> _loadLocalUser() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final email = prefs.getString('offline_user_email');
      final firstName = prefs.getString('offline_user_firstName');
      final lastName = prefs.getString('offline_user_lastName');
      final userId = prefs.getString(AppConstants.userIdKey);
      
      if (email != null && userId != null) {
        return UserModel(
          id: userId,
          email: email,
          firstName: firstName ?? email.split('@').first,
          lastName: lastName ?? '',
          createdAt: DateTime.now(),
        );
      }
    } catch (e) {
      debugPrint('Failed to load local user: $e');
    }
    return null;
  }

  Future<void> _saveLocalUser(UserModel user) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('offline_user_email', user.email);
      if (user.firstName != null) {
        await prefs.setString('offline_user_firstName', user.firstName!);
      }
      if (user.lastName != null) {
        await prefs.setString('offline_user_lastName', user.lastName!);
      }
      await prefs.setString(AppConstants.userIdKey, user.id);
      await prefs.setString(AppConstants.userTokenKey, 'local_token_${DateTime.now().millisecondsSinceEpoch}');
    } catch (e) {
      debugPrint('Failed to save local user: $e');
    }
  }

  UserModel _createLocalUser(String email, {String? firstName, String? lastName}) {
    return UserModel(
      id: 'user-${DateTime.now().millisecondsSinceEpoch}',
      email: email,
      firstName: firstName ?? email.split('@').first,
      lastName: lastName ?? '',
      createdAt: DateTime.now(),
    );
  }

  Future<void> register({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    String? phone,
  }) async {
    debugPrint('AuthNotifier: Registering user $email');
    state = state.copyWith(status: AuthStatus.loading, error: null);
    
    try {
      final user = await _repository.register(
        email: email,
        password: password,
        firstName: firstName,
        lastName: lastName,
        phone: phone,
      );
      debugPrint('AuthNotifier: Registration successful');
      await _saveLocalUser(user);
      state = AuthState(status: AuthStatus.authenticated, user: user);
    } catch (e) {
      debugPrint('AuthNotifier: Registration error: $e');
      // Create local user on any error (offline mode)
      final localUser = _createLocalUser(email, firstName: firstName, lastName: lastName);
      await _saveLocalUser(localUser);
      debugPrint('AuthNotifier: Created local user for offline mode');
      state = AuthState(status: AuthStatus.authenticated, user: localUser);
    }
  }

  Future<void> login({
    required String email,
    required String password,
  }) async {
    debugPrint('AuthNotifier: Logging in user $email');
    state = state.copyWith(status: AuthStatus.loading, error: null);
    
    try {
      final user = await _repository.login(
        email: email,
        password: password,
      );
      debugPrint('AuthNotifier: Login successful');
      await _saveLocalUser(user);
      state = AuthState(status: AuthStatus.authenticated, user: user);
    } catch (e) {
      debugPrint('AuthNotifier: Login error: $e');
      // Create local user on any error (offline mode)
      final localUser = _createLocalUser(email);
      await _saveLocalUser(localUser);
      debugPrint('AuthNotifier: Created local user for offline mode');
      state = AuthState(status: AuthStatus.authenticated, user: localUser);
    }
  }

  Future<void> demoLogin() async {
    debugPrint('AuthNotifier: Demo login');
    state = state.copyWith(status: AuthStatus.loading, error: null);
    
    final demoUser = UserModel(
      id: 'demo-user',
      email: 'demo@medreminder.com',
      firstName: 'Demo',
      lastName: 'User',
      createdAt: DateTime.now(),
    );
    
    await _saveLocalUser(demoUser);
    state = AuthState(status: AuthStatus.authenticated, user: demoUser);
  }

  Future<void> logout() async {
    debugPrint('AuthNotifier: Logging out');
    await _repository.logout();
    
    // Clear local user data
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('offline_user_email');
      await prefs.remove('offline_user_firstName');
      await prefs.remove('offline_user_lastName');
      await prefs.remove(AppConstants.userIdKey);
      await prefs.remove(AppConstants.userTokenKey);
    } catch (e) {
      debugPrint('Failed to clear local user: $e');
    }
    
    state = AuthState(status: AuthStatus.unauthenticated);
  }

  Future<void> updateProfile(Map<String, dynamic> updates) async {
    try {
      final user = await _repository.updateProfile(updates);
      await _saveLocalUser(user);
      state = state.copyWith(user: user);
    } catch (e) {
      debugPrint('AuthNotifier: Update profile error: $e');
      state = state.copyWith(error: e.toString());
    }
  }

  void clearError() {
    state = state.copyWith(error: null);
  }
}

// Auth provider
final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final repository = ref.watch(authRepositoryProvider);
  return AuthNotifier(repository);
});

// Convenience providers
final isAuthenticatedProvider = Provider<bool>((ref) {
  return ref.watch(authProvider).status == AuthStatus.authenticated;
});

final currentUserProvider = Provider<UserModel?>((ref) {
  return ref.watch(authProvider).user;
});

final currentUserIdProvider = Provider<String?>((ref) {
  return ref.watch(authProvider).user?.id;
});
