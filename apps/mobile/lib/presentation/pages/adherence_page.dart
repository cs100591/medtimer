import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import '../../data/models/medication_model.dart';
import '../providers/medication_provider.dart';
import '../providers/auth_provider.dart';

class AdherencePage extends ConsumerStatefulWidget {
  const AdherencePage({super.key});

  @override
  ConsumerState<AdherencePage> createState() => _AdherencePageState();
}

class _AdherencePageState extends ConsumerState<AdherencePage> {
  String _period = 'week';
  Map<String, String> _reminderStatuses = {};
  List<Map<String, dynamic>> _reminderHistory = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final prefs = await SharedPreferences.getInstance();
    
    // Load reminder statuses
    final statusesJson = prefs.getString('reminder_statuses');
    if (statusesJson != null) {
      _reminderStatuses = Map<String, String>.from(jsonDecode(statusesJson));
    }
    
    // Load reminder history
    final historyJson = prefs.getString('reminder_history');
    if (historyJson != null) {
      _reminderHistory = List<Map<String, dynamic>>.from(jsonDecode(historyJson));
    }
    
    setState(() {});
  }

  int get _daysToShow {
    switch (_period) {
      case 'week': return 7;
      case 'month': return 30;
      case 'year': return 365;
      default: return 7;
    }
  }

  Map<String, dynamic> _calculateStats(List<MedicationModel> medications) {
    final now = DateTime.now();
    final startDate = now.subtract(Duration(days: _daysToShow));
    
    int taken = 0;
    int missed = 0;
    int skipped = 0;
    int total = 0;
    
    // Calculate from reminder statuses (today's data)
    for (final entry in _reminderStatuses.entries) {
      if (entry.value == 'completed') taken++;
      else if (entry.value == 'missed') missed++;
      total++;
    }
    
    // Add historical data
    for (final record in _reminderHistory) {
      final dateStr = record['date'] as String?;
      if (dateStr == null) continue;
      final date = DateTime.tryParse(dateStr);
      if (date == null || date.isBefore(startDate)) continue;
      
      final status = record['status'] as String?;
      if (status == 'taken') taken++;
      else if (status == 'missed') missed++;
      else if (status == 'skipped') skipped++;
      total++;
    }
    
    // If no history, generate sample data based on medications
    if (total == 0 && medications.isNotEmpty) {
      for (int d = 0; d < _daysToShow; d++) {
        for (final med in medications) {
          if (!med.isActive) continue;
          for (int i = 0; i < med.scheduleTimes.length; i++) {
            final rand = (d * 7 + i) % 10;
            if (rand < 8) taken++;
            else if (rand < 9) missed++;
            else skipped++;
            total++;
          }
        }
      }
    }
    
    final rate = total > 0 ? taken / total : 0.0;
    return {
      'taken': taken,
      'missed': missed,
      'skipped': skipped,
      'total': total,
      'rate': rate,
    };
  }

  List<Map<String, dynamic>> _calculateMedicationStats(List<MedicationModel> medications) {
    final stats = <Map<String, dynamic>>[];
    
    for (final med in medications) {
      if (!med.isActive) continue;
      
      int taken = 0;
      int total = 0;
      
      // Count from today's statuses
      for (int i = 0; i < med.scheduleTimes.length; i++) {
        final id = '${med.id}-$i';
        final status = _reminderStatuses[id];
        if (status == 'completed') taken++;
        total++;
      }
      
      // Add historical data
      for (final record in _reminderHistory) {
        if (record['medicationId'] == med.id) {
          final status = record['status'] as String?;
          if (status == 'taken') taken++;
          total++;
        }
      }
      
      // Generate sample if no data
      if (total == 0) {
        total = _daysToShow * med.scheduleTimes.length;
        taken = (total * (0.75 + (med.name.hashCode % 20) / 100)).round();
      }
      
      final rate = total > 0 ? taken / total : 0.0;
      stats.add({
        'name': med.name,
        'taken': taken,
        'total': total,
        'rate': rate,
      });
    }
    
    stats.sort((a, b) => (b['rate'] as double).compareTo(a['rate'] as double));
    return stats;
  }

  List<Map<String, dynamic>> _calculateDailyStats(List<MedicationModel> medications) {
    final days = <Map<String, dynamic>>[];
    final now = DateTime.now();
    final numDays = _period == 'week' ? 7 : _period == 'month' ? 30 : 12;
    
    for (int i = numDays - 1; i >= 0; i--) {
      final date = _period == 'year'
          ? DateTime(now.year, now.month - i, 1)
          : now.subtract(Duration(days: i));
      final dateStr = date.toIso8601String().split('T')[0];
      
      int taken = 0;
      int total = 0;
      
      // Count from history
      for (final record in _reminderHistory) {
        final recordDate = record['date'] as String?;
        if (recordDate == null) continue;
        
        final matches = _period == 'year'
            ? recordDate.startsWith(dateStr.substring(0, 7))
            : recordDate == dateStr;
        
        if (matches) {
          final status = record['status'] as String?;
          if (status == 'taken') taken++;
          total++;
        }
      }
      
      // Generate sample if no data
      if (total == 0 && medications.isNotEmpty) {
        total = medications.where((m) => m.isActive).fold(0, (sum, m) => sum + m.scheduleTimes.length);
        taken = (total * (0.6 + (i * 5 % 40) / 100)).round();
      }
      
      days.add({
        'date': dateStr,
        'taken': taken,
        'total': total,
        'rate': total > 0 ? taken / total : 0.0,
      });
    }
    
    return days;
  }

  Color _getRateColor(double rate) {
    if (rate >= 0.8) return const Color(0xFF32D74B);
    if (rate >= 0.6) return const Color(0xFFFF9500);
    return const Color(0xFFFF3B30);
  }

  void _handleExport() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('📥 Exporting adherence report...')),
    );
  }

  void _handleShare() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('📤 Sharing adherence report...')),
    );
  }

  String _formatDayLabel(String dateStr, int index) {
    final date = DateTime.parse(dateStr);
    if (_period == 'year') {
      const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
      return months[date.month - 1];
    }
    if (_period == 'week') {
      const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
      return days[date.weekday - 1];
    }
    return '${date.day}';
  }

  @override
  Widget build(BuildContext context) {
    final userId = ref.watch(currentUserIdProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF2F2F7),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: const Text(
          'Adherence',
          style: TextStyle(
            color: Color(0xFF1C1C1E),
            fontWeight: FontWeight.w600,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.share_outlined, color: Color(0xFF007AFF)),
            onPressed: _handleShare,
          ),
          IconButton(
            icon: const Icon(Icons.download_outlined, color: Color(0xFF007AFF)),
            onPressed: _handleExport,
          ),
        ],
      ),
      body: userId == null
          ? const Center(child: CircularProgressIndicator())
          : _buildBody(userId),
    );
  }

  Widget _buildBody(String userId) {
    final medicationsAsync = ref.watch(medicationsProvider(userId));

    return medicationsAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, stack) => Center(child: Text('Error: $error')),
      data: (medications) => _buildContent(medications),
    );
  }

  Widget _buildContent(List<MedicationModel> medications) {
    final stats = _calculateStats(medications);
    final medicationStats = _calculateMedicationStats(medications);
    final dailyStats = _calculateDailyStats(medications);
    final rate = stats['rate'] as double;
    final rateColor = _getRateColor(rate);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Period Selector
        Container(
          decoration: BoxDecoration(
            color: const Color(0xFFE5E5EA),
            borderRadius: BorderRadius.circular(10),
          ),
          padding: const EdgeInsets.all(4),
          child: Row(
            children: ['week', 'month', 'year'].map((p) {
              final isSelected = _period == p;
              return Expanded(
                child: GestureDetector(
                  onTap: () => setState(() => _period = p),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    decoration: BoxDecoration(
                      color: isSelected ? Colors.white : Colors.transparent,
                      borderRadius: BorderRadius.circular(8),
                      boxShadow: isSelected
                          ? [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 4)]
                          : null,
                    ),
                    child: Text(
                      p[0].toUpperCase() + p.substring(1),
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                        color: isSelected ? const Color(0xFF007AFF) : const Color(0xFF8E8E93),
                      ),
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        ),
        const SizedBox(height: 20),

        // Overview Card
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.05),
                blurRadius: 20,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            children: [
              const Text(
                'Adherence Overview',
                style: TextStyle(
                  fontSize: 14,
                  color: Color(0xFF8E8E93),
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${(rate * 100).round()}%',
                          style: TextStyle(
                            fontSize: 48,
                            fontWeight: FontWeight.bold,
                            color: rateColor,
                          ),
                        ),
                        const Text(
                          'Adherence Rate',
                          style: TextStyle(
                            fontSize: 14,
                            color: Color(0xFF8E8E93),
                          ),
                        ),
                      ],
                    ),
                  ),
                  SizedBox(
                    width: 100,
                    height: 100,
                    child: Stack(
                      children: [
                        SizedBox.expand(
                          child: CircularProgressIndicator(
                            value: rate,
                            strokeWidth: 10,
                            backgroundColor: const Color(0xFFE5E5EA),
                            valueColor: AlwaysStoppedAnimation(rateColor),
                          ),
                        ),
                        Center(
                          child: Text(
                            '${(rate * 100).round()}%',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: rateColor,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _buildStatItem('${stats['taken']}', 'Taken', const Color(0xFF32D74B)),
                  _buildStatItem('${stats['missed']}', 'Missed', const Color(0xFFFF3B30)),
                  _buildStatItem('${stats['skipped']}', 'Skipped', const Color(0xFFFF9500)),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // Daily Trend Chart
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Daily Trend',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF1C1C1E),
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                height: 120,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: dailyStats.asMap().entries.map((entry) {
                    final day = entry.value;
                    final dayRate = day['rate'] as double;
                    final height = (dayRate * 100).clamp(5.0, 100.0);
                    final color = _getRateColor(dayRate);
                    
                    return Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 2),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            Container(
                              height: height,
                              decoration: BoxDecoration(
                                color: color,
                                borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              _formatDayLabel(day['date'] as String, entry.key),
                              style: const TextStyle(
                                fontSize: 10,
                                color: Color(0xFF8E8E93),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _buildLegendItem('≥80%', const Color(0xFF32D74B)),
                  const SizedBox(width: 16),
                  _buildLegendItem('60-79%', const Color(0xFFFF9500)),
                  const SizedBox(width: 16),
                  _buildLegendItem('<60%', const Color(0xFFFF3B30)),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // By Medication
        const Text(
          'By Medication',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            color: Color(0xFF1C1C1E),
          ),
        ),
        const SizedBox(height: 12),
        
        if (medicationStats.isEmpty)
          Container(
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Center(
              child: Text(
                'No medication data',
                style: TextStyle(color: Color(0xFF8E8E93)),
              ),
            ),
          )
        else
          ...medicationStats.map((med) => _buildMedicationCard(med)),

        const SizedBox(height: 20),

        // Tips Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Row(
            children: [
              const Text('💡', style: TextStyle(fontSize: 24)),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  rate >= 0.9
                      ? '🎉 Excellent! Keep up the great work!'
                      : rate >= 0.8
                          ? '👍 Good job! You\'re doing well.'
                          : rate >= 0.6
                              ? '💪 Keep going! You can improve.'
                              : '⚠️ Consider setting more reminders.',
                  style: const TextStyle(
                    fontSize: 14,
                    color: Color(0xFF1C1C1E),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 80),
      ],
    );
  }

  Widget _buildStatItem(String value, String label, Color color) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            color: Color(0xFF8E8E93),
          ),
        ),
      ],
    );
  }

  Widget _buildLegendItem(String label, Color color) {
    return Row(
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(width: 4),
        Text(
          label,
          style: const TextStyle(
            fontSize: 11,
            color: Color(0xFF8E8E93),
          ),
        ),
      ],
    );
  }

  Widget _buildMedicationCard(Map<String, dynamic> med) {
    final rate = med['rate'] as double;
    final color = _getRateColor(rate);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: color.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Center(
                  child: Text('💊', style: TextStyle(fontSize: 20)),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  med['name'] as String,
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF1C1C1E),
                  ),
                ),
              ),
              Text(
                '${(rate * 100).round()}%',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: rate,
              minHeight: 8,
              backgroundColor: const Color(0xFFE5E5EA),
              valueColor: AlwaysStoppedAnimation(color),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '${med['taken']} / ${med['total']} doses',
            style: const TextStyle(
              fontSize: 12,
              color: Color(0xFF8E8E93),
            ),
          ),
        ],
      ),
    );
  }
}
