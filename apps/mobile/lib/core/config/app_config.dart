import '../constants/app_constants.dart';

class AppConfig {
  static String get apiBaseUrl {
    // In production, this would come from environment config
    return AppConstants.apiBaseUrl;
  }
  
  static bool get isDebug {
    bool debug = false;
    assert(() {
      debug = true;
      return true;
    }());
    return debug;
  }
}
