import { 
  scheduleRepository, 
  CreateScheduleData, 
  UpdateScheduleData 
} from '../repositories/schedule.repository';
import { ScheduleEntity } from '../models/entities/Schedule.entity';
import { FrequencyType, DurationType, DayOfWeek } from '../types/shared-types';

export interface CreateScheduleInput {
  medicationId: string;
  frequencyType: FrequencyType;
  frequencyInterval?: number;
  timesPerDay?: number;
  specificDays?: number[];
  timeSlots: Array<{ hour: number; minute: number; label?: string }>;
  customCycle?: { activeDays: number; breakDays: number };
  durationType: DurationType;
  durationStartDate?: Date;
  durationEndDate?: Date;
  totalDays?: number;
  withFood?: boolean;
  beforeMeals?: boolean;
  afterMeals?: boolean;
  atBedtime?: boolean;
  onWaking?: boolean;
  emptyStomach?: boolean;
  customInstructions?: string;
}

export class ScheduleService {
  async createSchedule(userId: string, input: CreateScheduleInput): Promise<ScheduleEntity> {
    const startDate = input.durationStartDate || new Date();
    
    const data: CreateScheduleData = {
      medicationId: input.medicationId,
      userId,
      frequencyType: input.frequencyType,
      frequencyInterval: input.frequencyInterval,
      timesPerDay: input.timesPerDay || input.timeSlots.length,
      specificDays: input.specificDays,
      timeSlots: input.timeSlots,
      customCycle: input.customCycle ? { ...input.customCycle, startDate } : undefined,
      durationType: input.durationType,
      durationStartDate: startDate,
      durationEndDate: input.durationEndDate,
      totalDays: input.totalDays,
      withFood: input.withFood,
      beforeMeals: input.beforeMeals,
      afterMeals: input.afterMeals,
      atBedtime: input.atBedtime,
      onWaking: input.onWaking,
      emptyStomach: input.emptyStomach,
      customInstructions: input.customInstructions,
    };

    const schedule = await scheduleRepository.create(data);
    
    // Calculate and set the next reminder time
    const nextReminder = this.calculateNextReminder(schedule);
    if (nextReminder) {
      await scheduleRepository.updateNextReminder(schedule.id, nextReminder);
      schedule.nextReminderAt = nextReminder;
    }

    return schedule;
  }

  async getSchedule(id: string, userId: string): Promise<ScheduleEntity> {
    return scheduleRepository.findByIdAndUserOrFail(id, userId);
  }

  async updateSchedule(id: string, userId: string, input: UpdateScheduleData): Promise<ScheduleEntity> {
    const schedule = await scheduleRepository.update(id, userId, input);
    
    // Recalculate next reminder if schedule changed
    const nextReminder = this.calculateNextReminder(schedule);
    if (nextReminder) {
      await scheduleRepository.updateNextReminder(schedule.id, nextReminder);
      schedule.nextReminderAt = nextReminder;
    }

    return schedule;
  }

  async deleteSchedule(id: string, userId: string): Promise<void> {
    await scheduleRepository.delete(id, userId);
  }

  async listSchedules(userId: string, options?: { 
    isActive?: boolean; 
    page?: number; 
    limit?: number 
  }): Promise<{ schedules: ScheduleEntity[]; total: number; page: number; limit: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    
    const result = await scheduleRepository.findByUser(userId, options);
    
    return {
      ...result,
      page,
      limit,
    };
  }

  async getSchedulesByMedication(medicationId: string): Promise<ScheduleEntity[]> {
    return scheduleRepository.findByMedication(medicationId);
  }

  async getActiveSchedules(userId: string): Promise<ScheduleEntity[]> {
    return scheduleRepository.findActiveSchedules(userId);
  }

  async pauseSchedule(id: string, userId: string, until?: Date): Promise<ScheduleEntity> {
    return scheduleRepository.pauseSchedule(id, userId, until);
  }

  async resumeSchedule(id: string, userId: string): Promise<ScheduleEntity> {
    const schedule = await scheduleRepository.resumeSchedule(id, userId);
    
    // Recalculate next reminder
    const nextReminder = this.calculateNextReminder(schedule);
    if (nextReminder) {
      await scheduleRepository.updateNextReminder(schedule.id, nextReminder);
      schedule.nextReminderAt = nextReminder;
    }

    return schedule;
  }

  async getDueReminders(beforeTime: Date): Promise<ScheduleEntity[]> {
    return scheduleRepository.findDueReminders(beforeTime);
  }

  calculateNextReminder(schedule: ScheduleEntity, fromDate?: Date): Date | null {
    if (!schedule.isActive || schedule.isPaused) {
      return null;
    }

    const now = fromDate || new Date();
    const timeSlots = schedule.getTimeSlots();
    
    if (timeSlots.length === 0) {
      return null;
    }

    // Check if schedule has ended
    if (schedule.durationEndDate && schedule.durationEndDate < now) {
      return null;
    }

    // Check if in break period for cycle schedules
    if (schedule.durationType === DurationType.CYCLE) {
      const cycle = schedule.getCustomCycle();
      if (cycle && this.isInBreakPeriod(schedule, now)) {
        return this.getNextActiveDate(schedule, now);
      }
    }

    // Find next time slot
    const nextSlot = this.findNextTimeSlot(schedule, now);
    
    if (!nextSlot) {
      return null;
    }

    return nextSlot;
  }

  private findNextTimeSlot(schedule: ScheduleEntity, fromDate: Date): Date | null {
    const timeSlots = schedule.getTimeSlots();
    const specificDays = schedule.getSpecificDays();
    
    // Sort time slots by time
    const sortedSlots = [...timeSlots].sort((a, b) => {
      return (a.hour * 60 + a.minute) - (b.hour * 60 + b.minute);
    });

    // Try to find a slot today
    const today = new Date(fromDate);
    const currentMinutes = today.getHours() * 60 + today.getMinutes();

    for (const slot of sortedSlots) {
      const slotMinutes = slot.hour * 60 + slot.minute;
      
      if (slotMinutes > currentMinutes) {
        // Check if today is a valid day
        if (this.isValidDay(schedule, today, specificDays)) {
          const nextTime = new Date(today);
          nextTime.setHours(slot.hour, slot.minute, 0, 0);
          return nextTime;
        }
      }
    }

    // No slot today, find next valid day
    let nextDay = new Date(today);
    nextDay.setDate(nextDay.getDate() + 1);
    
    for (let i = 0; i < 365; i++) {
      if (this.isValidDay(schedule, nextDay, specificDays)) {
        const nextTime = new Date(nextDay);
        nextTime.setHours(sortedSlots[0].hour, sortedSlots[0].minute, 0, 0);
        return nextTime;
      }
      nextDay.setDate(nextDay.getDate() + 1);
    }

    return null;
  }

  private isValidDay(schedule: ScheduleEntity, date: Date, specificDays: number[] | null): boolean {
    const dayOfWeek = date.getDay();

    switch (schedule.frequencyType) {
      case FrequencyType.DAILY:
        return true;
      
      case FrequencyType.WEEKLY:
        if (specificDays && specificDays.length > 0) {
          return specificDays.includes(dayOfWeek);
        }
        return true;
      
      case FrequencyType.CUSTOM:
        // Check interval
        const startDate = new Date(schedule.durationStartDate);
        const daysDiff = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysDiff % schedule.frequencyInterval === 0;
      
      case FrequencyType.AS_NEEDED:
        return true;
      
      default:
        return true;
    }
  }

  private isInBreakPeriod(schedule: ScheduleEntity, date: Date): boolean {
    const cycle = schedule.getCustomCycle();
    if (!cycle) return false;

    const cycleStart = new Date(cycle.startDate);
    const daysSinceStart = Math.floor((date.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24));
    const cycleLength = cycle.activeDays + cycle.breakDays;
    const dayInCycle = daysSinceStart % cycleLength;

    return dayInCycle >= cycle.activeDays;
  }

  private getNextActiveDate(schedule: ScheduleEntity, fromDate: Date): Date | null {
    const cycle = schedule.getCustomCycle();
    if (!cycle) return null;

    const cycleStart = new Date(cycle.startDate);
    const daysSinceStart = Math.floor((fromDate.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24));
    const cycleLength = cycle.activeDays + cycle.breakDays;
    const currentCycleNumber = Math.floor(daysSinceStart / cycleLength);
    
    // Next active period starts at the beginning of the next cycle
    const nextCycleStart = new Date(cycleStart);
    nextCycleStart.setDate(nextCycleStart.getDate() + (currentCycleNumber + 1) * cycleLength);

    const timeSlots = schedule.getTimeSlots();
    if (timeSlots.length > 0) {
      nextCycleStart.setHours(timeSlots[0].hour, timeSlots[0].minute, 0, 0);
    }

    return nextCycleStart;
  }

  getTimingInstructions(schedule: ScheduleEntity): string[] {
    const instructions: string[] = [];

    if (schedule.withFood) instructions.push('Take with food');
    if (schedule.beforeMeals) instructions.push('Take before meals');
    if (schedule.afterMeals) instructions.push('Take after meals');
    if (schedule.atBedtime) instructions.push('Take at bedtime');
    if (schedule.onWaking) instructions.push('Take upon waking');
    if (schedule.emptyStomach) instructions.push('Take on empty stomach');
    if (schedule.customInstructions) instructions.push(schedule.customInstructions);

    return instructions;
  }
}

export const scheduleService = new ScheduleService();
