import 'dart:convert';
import 'package:dio/dio.dart';
import '../../core/config/app_config.dart';

/// Service for looking up medication information from barcodes
class BarcodeService {
  static final Dio _dio = Dio(BaseOptions(
    baseUrl: AppConfig.apiBaseUrl,
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 10),
  ));

  /// Look up medication data from a barcode (NDC, UPC, or EAN)
  static Future<Map<String, dynamic>?> lookupMedication(String barcode) async {
    // Clean the barcode
    final cleanBarcode = barcode.replaceAll(RegExp(r'[^0-9]'), '');
    
    if (cleanBarcode.isEmpty) return null;

    try {
      // Try our backend first
      final response = await _dio.get('/medications/barcode/$cleanBarcode');
      
      if (response.statusCode == 200 && response.data != null) {
        return _parseMedicationResponse(response.data);
      }
    } catch (e) {
      // Fall back to FDA database lookup
      return await _lookupFromFDA(cleanBarcode);
    }

    return null;
  }

  /// Look up from FDA NDC database
  static Future<Map<String, dynamic>?> _lookupFromFDA(String ndc) async {
    try {
      // Format NDC for FDA lookup (remove leading zeros, try different formats)
      final formattedNDC = _formatNDC(ndc);
      
      final response = await Dio().get(
        'https://api.fda.gov/drug/ndc.json',
        queryParameters: {'search': 'product_ndc:"$formattedNDC"', 'limit': 1},
      );

      if (response.statusCode == 200 && response.data['results'] != null) {
        final results = response.data['results'] as List;
        if (results.isNotEmpty) {
          return _parseFDAResponse(results.first);
        }
      }
    } catch (e) {
      // FDA lookup failed, return null
    }

    return null;
  }

  /// Format NDC code for FDA API lookup
  static String _formatNDC(String barcode) {
    // NDC codes can be 10 or 11 digits
    // UPC-A barcodes are 12 digits (first digit is often 0 for drugs)
    if (barcode.length == 12 && barcode.startsWith('0')) {
      barcode = barcode.substring(1);
    }
    
    // Try to format as 5-4-2 or 5-3-2 NDC format
    if (barcode.length == 11) {
      return '${barcode.substring(0, 5)}-${barcode.substring(5, 9)}-${barcode.substring(9)}';
    } else if (barcode.length == 10) {
      return '${barcode.substring(0, 5)}-${barcode.substring(5, 8)}-${barcode.substring(8)}';
    }
    
    return barcode;
  }

  static Map<String, dynamic> _parseMedicationResponse(Map<String, dynamic> data) {
    return {
      'name': data['name'] ?? data['brand_name'] ?? '',
      'genericName': data['genericName'] ?? data['generic_name'] ?? '',
      'dosage': data['dosage'] ?? data['strength'] ?? '',
      'form': _normalizeForm(data['form'] ?? data['dosage_form'] ?? ''),
      'manufacturer': data['manufacturer'] ?? data['labeler_name'] ?? '',
      'ndc': data['ndc'] ?? data['product_ndc'] ?? '',
      'instructions': data['instructions'] ?? '',
    };
  }

  static Map<String, dynamic> _parseFDAResponse(Map<String, dynamic> data) {
    return {
      'name': data['brand_name'] ?? data['generic_name'] ?? '',
      'genericName': data['generic_name'] ?? '',
      'dosage': _extractDosage(data['active_ingredients'] ?? []),
      'form': _normalizeForm(data['dosage_form'] ?? ''),
      'manufacturer': data['labeler_name'] ?? '',
      'ndc': data['product_ndc'] ?? '',
      'instructions': '',
    };
  }

  static String _extractDosage(List<dynamic> ingredients) {
    if (ingredients.isEmpty) return '';
    
    final first = ingredients.first;
    if (first is Map) {
      final strength = first['strength'] ?? '';
      return strength.toString();
    }
    return '';
  }

  static String _normalizeForm(String form) {
    final normalized = form.toLowerCase();
    
    if (normalized.contains('tablet')) return 'Tablet';
    if (normalized.contains('capsule')) return 'Capsule';
    if (normalized.contains('liquid') || normalized.contains('solution')) return 'Liquid';
    if (normalized.contains('injection')) return 'Injection';
    if (normalized.contains('inhaler') || normalized.contains('aerosol')) return 'Inhaler';
    if (normalized.contains('cream') || normalized.contains('ointment')) return 'Cream';
    if (normalized.contains('drop')) return 'Drops';
    if (normalized.contains('patch')) return 'Patch';
    
    return form.isNotEmpty ? form : 'Tablet';
  }
}
