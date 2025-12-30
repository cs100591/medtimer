// Custom exceptions for the app
class AppException implements Exception {
  final String message;
  final String? code;
  final dynamic originalError;

  AppException(this.message, {this.code, this.originalError});

  @override
  String toString() => 'AppException: $message${code != null ? ' ($code)' : ''}';
}

class NetworkException extends AppException {
  NetworkException(super.message, {super.code, super.originalError});
}

class AuthException extends AppException {
  AuthException(super.message, {super.code, super.originalError});
}

class ValidationException extends AppException {
  final Map<String, String>? fieldErrors;
  ValidationException(super.message, {this.fieldErrors, super.code});
}

class SyncException extends AppException {
  SyncException(super.message, {super.code, super.originalError});
}

class StorageException extends AppException {
  StorageException(super.message, {super.code, super.originalError});
}
