import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/user_model.dart';
import '../../data/repositories/auth_repository.dart';
import '../../data/datasources/api_service.dart';

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
          // Token might be invalid, logout
          await _repository.logout();
          state = AuthState(status: AuthStatus.unauthenticated);
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
      state = AuthState(status: AuthStatus.authenticated, user: user);
    } on ApiException catch (e) {
      debugPrint('AuthNotifier: Registration API error: ${e.message}');
      state = state.copyWith(
        status: AuthStatus.unauthenticated,
        error: e.message,
      );
    } catch (e) {
      debugPrint('AuthNotifier: Registration error: $e');
      // Check if offline mode was enabled (user was created locally)
      if (_repository.isAuthenticated) {
        debugPrint('AuthNotifier: Offline mode enabled, user authenticated locally');
        try {
          final user = await _repository.getProfile();
          state = AuthState(status: AuthStatus.authenticated, user: user);
          return;
        } catch (_) {}
      }
      state = state.copyWith(
        status: AuthStatus.unauthenticated,
        error: 'Connection failed. Please check your internet connection.',
      );
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
      state = AuthState(status: AuthStatus.authenticated, user: user);
    } on ApiException catch (e) {
      debugPrint('AuthNotifier: Login API error: ${e.message}');
      state = state.copyWith(
        status: AuthStatus.unauthenticated,
        error: e.message,
      );
    } catch (e) {
      debugPrint('AuthNotifier: Login error: $e');
      // Check if offline mode was enabled (user was logged in locally)
      if (_repository.isAuthenticated) {
        debugPrint('AuthNotifier: Offline mode enabled, user authenticated locally');
        try {
          final user = await _repository.getProfile();
          state = AuthState(status: AuthStatus.authenticated, user: user);
          return;
        } catch (_) {}
      }
      state = state.copyWith(
        status: AuthStatus.unauthenticated,
        error: 'Connection failed. Please check your internet connection.',
      );
    }
  }

  Future<void> logout() async {
    debugPrint('AuthNotifier: Logging out');
    await _repository.logout();
    state = AuthState(status: AuthStatus.unauthenticated);
  }

  Future<void> updateProfile(Map<String, dynamic> updates) async {
    try {
      final user = await _repository.updateProfile(updates);
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
