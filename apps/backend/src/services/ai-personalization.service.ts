import { AdherenceStatus } from '../types/shared-types';
import { AdherenceRepository } from '../repositories/adherence.repository';
import { ScheduleRepository } from '../repositories/schedule.repository';
import { logger } from '../utils/logger';

export interface BehaviorPattern {
  userId: string;
  patternType: 'snooze' | 'skip' | 'timing' | 'compliance';
  data: Record<string, unknown>;
  confidence: number;
  detectedAt: Date;
  lastUpdated: Date;
}

export interface TimingRecommendation {
  scheduleId: string;
  currentTime: string;
  recommendedTime: string;
  reason: string;
  confidence: number;
  basedOnPatterns: string[];
}

export interface WellnessTip {
  id: string;
  category: 'hydration' | 'food' | 'activity' | 'sleep' | 'general';
  title: string;
  content: string;
  relevantMedications: string[];
  priority: number;
}

export interface PersonalizationInsight {
  userId: string;
  type: 'timing' | 'compliance' | 'wellness' | 'interaction';
  title: string;
  description: string;
  actionable: boolean;
  action?: string;
  confidence: number;
  generatedAt: Date;
}

export class AIPersonalizationService {
  private patterns: Map<string, BehaviorPattern[]> = new Map();
  private recommendations: Map<string, TimingRecommendation[]> = new Map();

  constructor(
    private adherenceRepo: AdherenceRepository,
    private scheduleRepo: ScheduleRepository
  ) {}

  async analyzeUserPatterns(userId: string, days: number = 30): Promise<BehaviorPattern[]> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const records = await this.adherenceRepo.findByFilters({
      userId,
      startDate,
      endDate,
    });

    const patterns: BehaviorPattern[] = [];

    // Analyze snooze patterns
    const snoozePattern = this.analyzeSnoozePattern(userId, records);
    if (snoozePattern) patterns.push(snoozePattern);

    // Analyze skip patterns
    const skipPattern = this.analyzeSkipPattern(userId, records);
    if (skipPattern) patterns.push(skipPattern);

    // Analyze timing patterns
    const timingPattern = this.analyzeTimingPattern(userId, records);
    if (timingPattern) patterns.push(timingPattern);

    // Analyze compliance patterns
    const compliancePattern = this.analyzeCompliancePattern(userId, records);
    if (compliancePattern) patterns.push(compliancePattern);

    this.patterns.set(userId, patterns);
    logger.info(`Analyzed ${patterns.length} patterns for user ${userId}`);

    return patterns;
  }

  async generateTimingRecommendations(userId: string): Promise<TimingRecommendation[]> {
    const patterns = this.patterns.get(userId) || await this.analyzeUserPatterns(userId);
    const schedules = await this.scheduleRepo.findByUserId(userId);
    const recommendations: TimingRecommendation[] = [];

    for (const schedule of schedules) {
      if (!schedule.isActive) continue;

      const timeSlots = schedule.getTimeSlots();
      for (const slot of timeSlots) {
        const time = `${slot.hour.toString().padStart(2, '0')}:${slot.minute.toString().padStart(2, '0')}`;
        const recommendation = this.calculateOptimalTime(time, patterns);
        if (recommendation && recommendation.confidence > 0.6) {
          recommendations.push({
            scheduleId: schedule.id,
            currentTime: time,
            recommendedTime: recommendation.time,
            reason: recommendation.reason,
            confidence: recommendation.confidence,
            basedOnPatterns: recommendation.patterns,
          });
        }
      }
    }

    this.recommendations.set(userId, recommendations);
    return recommendations;
  }

  async getWellnessTips(userId: string): Promise<WellnessTip[]> {
    // Get user's medications to provide relevant tips
    const schedules = await this.scheduleRepo.findByUserId(userId);
    const medicationIds: string[] = [...new Set(schedules.map(s => s.medicationId))];

    const tips: WellnessTip[] = [
      {
        id: 'tip_hydration_1',
        category: 'hydration',
        title: 'Stay Hydrated',
        content: 'Drinking water helps your body absorb medications better. Aim for 8 glasses a day.',
        relevantMedications: [],
        priority: 1,
      },
      {
        id: 'tip_food_1',
        category: 'food',
        title: 'Take with Food',
        content: 'Some medications work better when taken with food. Check your medication instructions.',
        relevantMedications: medicationIds,
        priority: 2,
      },
      {
        id: 'tip_timing_1',
        category: 'general',
        title: 'Consistent Timing',
        content: 'Taking medications at the same time each day helps maintain steady levels in your body.',
        relevantMedications: [],
        priority: 1,
      },
      {
        id: 'tip_sleep_1',
        category: 'sleep',
        title: 'Evening Medications',
        content: 'If your medication causes drowsiness, consider taking it before bedtime.',
        relevantMedications: [],
        priority: 3,
      },
    ];

    return tips.sort((a, b) => a.priority - b.priority);
  }

  async generateInsights(userId: string): Promise<PersonalizationInsight[]> {
    const patterns = this.patterns.get(userId) || await this.analyzeUserPatterns(userId);
    const recommendations = this.recommendations.get(userId) || await this.generateTimingRecommendations(userId);
    const insights: PersonalizationInsight[] = [];

    // Generate insights from patterns
    for (const pattern of patterns) {
      if (pattern.confidence > 0.7) {
        const insight = this.patternToInsight(pattern);
        if (insight) insights.push(insight);
      }
    }

    // Generate insights from recommendations
    for (const rec of recommendations) {
      if (rec.confidence > 0.7) {
        insights.push({
          userId,
          type: 'timing',
          title: 'Optimal Timing Suggestion',
          description: `Consider changing your ${rec.currentTime} dose to ${rec.recommendedTime}. ${rec.reason}`,
          actionable: true,
          action: `Update schedule to ${rec.recommendedTime}`,
          confidence: rec.confidence,
          generatedAt: new Date(),
        });
      }
    }

    return insights;
  }

  async applyRecommendation(
    userId: string,
    scheduleId: string,
    newTime: string
  ): Promise<boolean> {
    const schedule = await this.scheduleRepo.findById(scheduleId);
    if (!schedule || schedule.userId !== userId) {
      return false;
    }

    const recommendation = this.recommendations.get(userId)?.find(
      r => r.scheduleId === scheduleId
    );

    if (!recommendation) {
      return false;
    }

    // Parse new time
    const [newHours, newMinutes] = newTime.split(':').map(Number);
    
    // Update the schedule time slots
    const timeSlots = schedule.getTimeSlots();
    const updatedSlots = timeSlots.map(slot => {
      const slotTime = `${slot.hour.toString().padStart(2, '0')}:${slot.minute.toString().padStart(2, '0')}`;
      if (slotTime === recommendation.currentTime) {
        return { ...slot, hour: newHours, minute: newMinutes };
      }
      return slot;
    });
    schedule.setTimeSlots(updatedSlots);

    await this.scheduleRepo.update(scheduleId, userId, { timeSlots: updatedSlots });

    logger.info(`Applied timing recommendation for schedule ${scheduleId}: ${recommendation.currentTime} -> ${newTime}`);
    return true;
  }

  getPatternConfidence(userId: string, patternType: string): number {
    const patterns = this.patterns.get(userId) || [];
    const pattern = patterns.find(p => p.patternType === patternType);
    return pattern?.confidence || 0;
  }

  private analyzeSnoozePattern(userId: string, records: any[]): BehaviorPattern | null {
    const snoozedRecords = records.filter(r => r.snoozeCount > 0);
    if (snoozedRecords.length < 5) return null;

    // Analyze snooze times
    const snoozeByHour = new Map<number, number>();
    for (const record of snoozedRecords) {
      const hour = new Date(record.scheduledTime).getHours();
      snoozeByHour.set(hour, (snoozeByHour.get(hour) || 0) + 1);
    }

    const mostSnoozedHour = [...snoozeByHour.entries()]
      .sort((a, b) => b[1] - a[1])[0];

    const confidence = snoozedRecords.length / records.length;

    return {
      userId,
      patternType: 'snooze',
      data: {
        totalSnoozes: snoozedRecords.length,
        mostSnoozedHour: mostSnoozedHour?.[0],
        snoozeRate: confidence,
        byHour: Object.fromEntries(snoozeByHour),
      },
      confidence: Math.min(confidence * 2, 1),
      detectedAt: new Date(),
      lastUpdated: new Date(),
    };
  }

  private analyzeSkipPattern(userId: string, records: any[]): BehaviorPattern | null {
    const skippedRecords = records.filter(r => r.status === AdherenceStatus.SKIPPED);
    if (skippedRecords.length < 3) return null;

    // Analyze skip days
    const skipByDay = new Map<number, number>();
    for (const record of skippedRecords) {
      const day = new Date(record.scheduledTime).getDay();
      skipByDay.set(day, (skipByDay.get(day) || 0) + 1);
    }

    const mostSkippedDay = [...skipByDay.entries()]
      .sort((a, b) => b[1] - a[1])[0];

    const skipRate = skippedRecords.length / records.length;

    return {
      userId,
      patternType: 'skip',
      data: {
        totalSkips: skippedRecords.length,
        mostSkippedDay: mostSkippedDay?.[0],
        skipRate,
        byDay: Object.fromEntries(skipByDay),
      },
      confidence: Math.min(skipRate * 3, 1),
      detectedAt: new Date(),
      lastUpdated: new Date(),
    };
  }

  private analyzeTimingPattern(userId: string, records: any[]): BehaviorPattern | null {
    const takenRecords = records.filter(
      r => r.status === AdherenceStatus.TAKEN && r.actualTime
    );
    if (takenRecords.length < 10) return null;

    // Calculate average delay
    const delays = takenRecords.map(r => {
      const scheduled = new Date(r.scheduledTime).getTime();
      const actual = new Date(r.actualTime).getTime();
      return (actual - scheduled) / 60000; // minutes
    });

    const avgDelay = delays.reduce((a, b) => a + b, 0) / delays.length;
    const stdDev = Math.sqrt(
      delays.reduce((sum, d) => sum + Math.pow(d - avgDelay, 2), 0) / delays.length
    );

    // Higher confidence if consistent timing
    const confidence = Math.max(0, 1 - (stdDev / 60));

    return {
      userId,
      patternType: 'timing',
      data: {
        averageDelayMinutes: Math.round(avgDelay),
        standardDeviation: Math.round(stdDev),
        sampleSize: takenRecords.length,
        consistentlyEarly: avgDelay < -10,
        consistentlyLate: avgDelay > 10,
      },
      confidence,
      detectedAt: new Date(),
      lastUpdated: new Date(),
    };
  }

  private analyzeCompliancePattern(userId: string, records: any[]): BehaviorPattern | null {
    if (records.length < 7) return null;

    const taken = records.filter(r => r.status === AdherenceStatus.TAKEN).length;
    const total = records.length;
    const complianceRate = taken / total;

    // Analyze trend
    const recentRecords = records.slice(0, Math.min(7, records.length));
    const recentTaken = recentRecords.filter(r => r.status === AdherenceStatus.TAKEN).length;
    const recentRate = recentTaken / recentRecords.length;

    const trend = recentRate > complianceRate ? 'improving' : 
                  recentRate < complianceRate ? 'declining' : 'stable';

    return {
      userId,
      patternType: 'compliance',
      data: {
        overallRate: Math.round(complianceRate * 100),
        recentRate: Math.round(recentRate * 100),
        trend,
        totalRecords: total,
      },
      confidence: Math.min(total / 30, 1),
      detectedAt: new Date(),
      lastUpdated: new Date(),
    };
  }

  private calculateOptimalTime(
    currentTime: string,
    patterns: BehaviorPattern[]
  ): { time: string; reason: string; confidence: number; patterns: string[] } | null {
    const timingPattern = patterns.find(p => p.patternType === 'timing');
    const snoozePattern = patterns.find(p => p.patternType === 'snooze');

    if (!timingPattern && !snoozePattern) return null;

    const avgDelay = (timingPattern?.data.averageDelayMinutes as number) || 0;
    const usedPatterns: string[] = [];
    let reason = '';

    // Parse current time
    const [hours, minutes] = currentTime.split(':').map(Number);
    let newHours = hours;
    let newMinutes = minutes;

    // Adjust based on timing pattern
    if (timingPattern && Math.abs(avgDelay) > 15) {
      newMinutes += Math.round(avgDelay);
      if (newMinutes >= 60) {
        newHours += Math.floor(newMinutes / 60);
        newMinutes = newMinutes % 60;
      } else if (newMinutes < 0) {
        newHours -= Math.ceil(Math.abs(newMinutes) / 60);
        newMinutes = 60 + (newMinutes % 60);
      }
      usedPatterns.push('timing');
      reason = avgDelay > 0 
        ? `You typically take this ${Math.abs(avgDelay)} minutes late`
        : `You typically take this ${Math.abs(avgDelay)} minutes early`;
    }

    // Adjust based on snooze pattern
    if (snoozePattern && (snoozePattern.data.snoozeRate as number) > 0.3) {
      usedPatterns.push('snooze');
      reason += reason ? '. ' : '';
      reason += 'You frequently snooze this reminder';
    }

    if (usedPatterns.length === 0) return null;

    const newTime = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
    
    if (newTime === currentTime) return null;

    const confidence = Math.max(
      timingPattern?.confidence || 0,
      snoozePattern?.confidence || 0
    );

    return { time: newTime, reason, confidence, patterns: usedPatterns };
  }

  private patternToInsight(pattern: BehaviorPattern): PersonalizationInsight | null {
    switch (pattern.patternType) {
      case 'compliance':
        const rate = pattern.data.overallRate as number;
        const trend = pattern.data.trend as string;
        return {
          userId: pattern.userId,
          type: 'compliance',
          title: trend === 'improving' ? 'Great Progress!' : 
                 trend === 'declining' ? 'Compliance Alert' : 'Steady Compliance',
          description: `Your medication compliance is ${rate}% and ${trend}.`,
          actionable: trend === 'declining',
          action: trend === 'declining' ? 'Review your medication schedule' : undefined,
          confidence: pattern.confidence,
          generatedAt: new Date(),
        };

      case 'snooze':
        const snoozeRate = pattern.data.snoozeRate as number;
        if (snoozeRate > 0.3) {
          return {
            userId: pattern.userId,
            type: 'timing',
            title: 'Frequent Snoozing Detected',
            description: `You snooze ${Math.round(snoozeRate * 100)}% of your reminders. Consider adjusting your schedule.`,
            actionable: true,
            action: 'Review timing recommendations',
            confidence: pattern.confidence,
            generatedAt: new Date(),
          };
        }
        return null;

      default:
        return null;
    }
  }
}

// Factory function
export function createAIPersonalizationService(): AIPersonalizationService {
  const { adherenceRepository } = require('../repositories/adherence.repository');
  const { scheduleRepository } = require('../repositories/schedule.repository');
  return new AIPersonalizationService(adherenceRepository, scheduleRepository);
}

export const aiPersonalizationService = createAIPersonalizationService();
