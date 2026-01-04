import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';

class ProfileSetupDialog extends StatefulWidget {
  final VoidCallback onComplete;

  const ProfileSetupDialog({super.key, required this.onComplete});

  @override
  State<ProfileSetupDialog> createState() => _ProfileSetupDialogState();
}

class _ProfileSetupDialogState extends State<ProfileSetupDialog> {
  final _ageController = TextEditingController();
  final _heightController = TextEditingController();
  final _weightController = TextEditingController();
  String _gender = 'male';
  bool _isSubmitting = false;

  @override
  void dispose() {
    _ageController.dispose();
    _heightController.dispose();
    _weightController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    // Validate inputs
    final age = int.tryParse(_ageController.text);
    final height = double.tryParse(_heightController.text);
    final weight = double.tryParse(_weightController.text);

    if (age == null || age < 1 || age > 120) {
      _showError('Please enter a valid age (1-120)');
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final prefs = await SharedPreferences.getInstance();
      
      // Save profile data
      final profile = {
        'age': age,
        'gender': _gender,
        'height': height,
        'weight': weight,
        'createdAt': DateTime.now().toIso8601String(),
      };
      
      await prefs.setString('user_profile', jsonEncode(profile));
      await prefs.setBool('profile_setup_complete', true);
      
      // Create anonymous local user
      final userId = 'user-${DateTime.now().millisecondsSinceEpoch}';
      await prefs.setString('user_id', userId);
      await prefs.setString('user_token', 'local_token_${DateTime.now().millisecondsSinceEpoch}');
      
      widget.onComplete();
    } catch (e) {
      _showError('Failed to save profile. Please try again.');
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.red),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.all(20),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 400),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.15),
              blurRadius: 30,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Header
                Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(
                    color: const Color(0xFF007AFF).withOpacity(0.12),
                    shape: BoxShape.circle,
                  ),
                  child: const Center(
                    child: Text('💊', style: TextStyle(fontSize: 36)),
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Welcome to MedTimer!',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF1C1C1E),
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  "Let's set up your profile",
                  style: TextStyle(
                    fontSize: 15,
                    color: Color(0xFF8E8E93),
                  ),
                ),
                const SizedBox(height: 24),

                // Age Field
                _buildTextField(
                  controller: _ageController,
                  label: 'Age',
                  hint: 'Enter your age',
                  suffix: 'years',
                  keyboardType: TextInputType.number,
                  icon: Icons.cake_outlined,
                ),
                const SizedBox(height: 16),

                // Gender Selector
                _buildGenderSelector(),
                const SizedBox(height: 16),

                // Height Field
                _buildTextField(
                  controller: _heightController,
                  label: 'Height (optional)',
                  hint: 'Enter your height',
                  suffix: 'cm',
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  icon: Icons.height,
                ),
                const SizedBox(height: 16),

                // Weight Field
                _buildTextField(
                  controller: _weightController,
                  label: 'Weight (optional)',
                  hint: 'Enter your weight',
                  suffix: 'kg',
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  icon: Icons.monitor_weight_outlined,
                ),
                const SizedBox(height: 24),

                // Submit Button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _isSubmitting ? null : _submit,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF007AFF),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      elevation: 0,
                    ),
                    child: _isSubmitting
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation(Colors.white),
                            ),
                          )
                        : const Text(
                            'Get Started',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required String suffix,
    required TextInputType keyboardType,
    required IconData icon,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: Color(0xFF1C1C1E),
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          keyboardType: keyboardType,
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(color: Color(0xFFAEAEB2)),
            prefixIcon: Padding(
              padding: const EdgeInsets.only(left: 12, right: 8),
              child: Icon(icon, color: const Color(0xFF8E8E93), size: 22),
            ),
            prefixIconConstraints: const BoxConstraints(minWidth: 44, minHeight: 44),
            suffixText: suffix,
            suffixStyle: const TextStyle(color: Color(0xFF8E8E93)),
            filled: true,
            fillColor: const Color(0xFFF2F2F7),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          ),
        ),
      ],
    );
  }

  Widget _buildGenderSelector() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Gender',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: Color(0xFF1C1C1E),
          ),
        ),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: const Color(0xFFF2F2F7),
            borderRadius: BorderRadius.circular(12),
          ),
          padding: const EdgeInsets.all(4),
          child: Row(
            children: [
              _buildGenderOption('male', '👨 Male'),
              _buildGenderOption('female', '👩 Female'),
              _buildGenderOption('other', '🧑 Other'),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildGenderOption(String value, String label) {
    final isSelected = _gender == value;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _gender = value),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: isSelected ? Colors.white : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
            boxShadow: isSelected
                ? [BoxShadow(color: Colors.black.withOpacity(0.08), blurRadius: 4)]
                : null,
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 13,
              fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
              color: isSelected ? const Color(0xFF007AFF) : const Color(0xFF8E8E93),
            ),
          ),
        ),
      ),
    );
  }
}

// Helper function to check if profile setup is complete
Future<bool> isProfileSetupComplete() async {
  final prefs = await SharedPreferences.getInstance();
  return prefs.getBool('profile_setup_complete') ?? false;
}

// Helper function to get user profile
Future<Map<String, dynamic>?> getUserProfile() async {
  final prefs = await SharedPreferences.getInstance();
  final profileJson = prefs.getString('user_profile');
  if (profileJson != null) {
    return jsonDecode(profileJson) as Map<String, dynamic>;
  }
  return null;
}
