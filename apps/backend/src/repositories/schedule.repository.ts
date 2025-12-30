import { Repository, LessThanOrEqual, MoreThanOrEqual, IsNull, Not } from 'typeorm';
import { AppDataSource } from '../database/data-source';
import { ScheduleEntity } from '../models/entities/Schedule.entity';
import { NotFoundError } from '../middleware/error.middleware';
import { FrequencyType, DurationType, EscalationLevel } from '../types/shared-types';

export interface CreateScheduleData {
  medicationId: string;
  userId: string;
  frequencyType: FrequencyType;
  frequencyInterval?: number;
  timesPerDay?: number;
  specificDays?: number[];
  timeSlots: Array<{ hour: number; minute: number; label?: string }>;
  customCycle?: { activeDays: number; breakDays: number; startDate: Date };
  durationType: DurationType;
  durationStartDate: Date;
  durationEndDate?: Date;
  totalDays?: number;
  withFood?: boolean;
  beforeMeals?: boolean;
  afterMeals?: boolean;
  atBedtime?: boolean;
  onWaking?: boolean;
  emptyStomach?: boolean;
  customInstructions?: string;
  escalationRules?: Array<{
    level: EscalationLevel;
    delayMinutes: number;
    maxAttempts: number;
    notifyCaregiver: boolean;
  }>;
}

export interface UpdateScheduleData {
  frequencyType?: FrequencyType;
  frequencyInterval?: number;
  timesPerDay?: number;
  specificDays?: number[];
  timeSlots?: Array<{ hour: number; minute: number; label?: string }>;
  customCycle?: { activeDays: number; breakDays: number; startDate: Date };
  durationType?: DurationType;
  durationEndDate?: Date;
  totalDays?: number;
  withFood?: boolean;
  beforeMeals?: boolean;
  afterMeals?: boolean;
  atBedtime?: boolean;
  onWaking?: boolean;
  emptyStomach?: boolean;
  customInstructions?: string;
  escalationRules?: Array<{
    level: EscalationLevel;
    delayMinutes: number;
    maxAttempts: number;
    notifyCaregiver: boolean;
  }>;
  isActive?: boolean;
  isPaused?: boolean;
  pausedUntil?: Date;
}

export class ScheduleRepository {
  private repository: Repository<ScheduleEntity>;

  constructor() {
    this.repository = AppDataSource.getRepository(ScheduleEntity);
  }

  async findById(id: string): Promise<ScheduleEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByIdOrFail(id: string): Promise<ScheduleEntity> {
    const schedule = await this.findById(id);
    if (!schedule) {
      throw new NotFoundError(`Schedule with id ${id} not found`);
    }
    return schedule;
  }

  async findByIdAndUser(id: string, userId: string): Promise<ScheduleEntity | null> {
    return this.repository.findOne({ where: { id, userId } });
  }

  async findByIdAndUserOrFail(id: string, userId: string): Promise<ScheduleEntity> {
    const schedule = await this.findByIdAndUser(id, userId);
    if (!schedule) {
      throw new NotFoundError(`Schedule with id ${id} not found`);
    }
    return schedule;
  }

  async create(data: CreateScheduleData): Promise<ScheduleEntity> {
    const schedule = this.repository.create({
      medicationId: data.medicationId,
      userId: data.userId,
      frequencyType: data.frequencyType,
      frequencyInterval: data.frequencyInterval || 1,
      timesPerDay: data.timesPerDay || 1,
      durationType: data.durationType,
      durationStartDate: data.durationStartDate,
      durationEndDate: data.durationEndDate || null,
      totalDays: data.totalDays || null,
      withFood: data.withFood || false,
      beforeMeals: data.beforeMeals || false,
      afterMeals: data.afterMeals || false,
      atBedtime: data.atBedtime || false,
      onWaking: data.onWaking || false,
      emptyStomach: data.emptyStomach || false,
      customInstructions: data.customInstructions || null,
    });

    schedule.setTimeSlots(data.timeSlots);
    
    if (data.specificDays) {
      schedule.setSpecificDays(data.specificDays);
    }
    
    if (data.customCycle) {
      schedule.setCustomCycle(data.customCycle);
    }

    if (data.escalationRules) {
      schedule.setEscalationRules(data.escalationRules);
    } else {
      schedule.setEscalationRules(schedule.getDefaultEscalationRules());
    }

    return this.repository.save(schedule);
  }

  async update(id: string, userId: string, data: UpdateScheduleData): Promise<ScheduleEntity> {
    const schedule = await this.findByIdAndUserOrFail(id, userId);

    if (data.frequencyType !== undefined) schedule.frequencyType = data.frequencyType;
    if (data.frequencyInterval !== undefined) schedule.frequencyInterval = data.frequencyInterval;
    if (data.timesPerDay !== undefined) schedule.timesPerDay = data.timesPerDay;
    if (data.durationType !== undefined) schedule.durationType = data.durationType;
    if (data.durationEndDate !== undefined) schedule.durationEndDate = data.durationEndDate;
    if (data.totalDays !== undefined) schedule.totalDays = data.totalDays;
    if (data.withFood !== undefined) schedule.withFood = data.withFood;
    if (data.beforeMeals !== undefined) schedule.beforeMeals = data.beforeMeals;
    if (data.afterMeals !== undefined) schedule.afterMeals = data.afterMeals;
    if (data.atBedtime !== undefined) schedule.atBedtime = data.atBedtime;
    if (data.onWaking !== undefined) schedule.onWaking = data.onWaking;
    if (data.emptyStomach !== undefined) schedule.emptyStomach = data.emptyStomach;
    if (data.customInstructions !== undefined) schedule.customInstructions = data.customInstructions;
    if (data.isActive !== undefined) schedule.isActive = data.isActive;
    if (data.isPaused !== undefined) schedule.isPaused = data.isPaused;
    if (data.pausedUntil !== undefined) schedule.pausedUntil = data.pausedUntil;

    if (data.timeSlots) {
      schedule.setTimeSlots(data.timeSlots);
    }
    if (data.specificDays) {
      schedule.setSpecificDays(data.specificDays);
    }
    if (data.customCycle) {
      schedule.setCustomCycle(data.customCycle);
    }
    if (data.escalationRules) {
      schedule.setEscalationRules(data.escalationRules);
    }

    return this.repository.save(schedule);
  }

  async delete(id: string, userId: string): Promise<void> {
    const schedule = await this.findByIdAndUserOrFail(id, userId);
    await this.repository.remove(schedule);
  }

  async findByMedication(medicationId: string): Promise<ScheduleEntity[]> {
    return this.repository.find({
      where: { medicationId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findByUser(userId: string, options?: { 
    isActive?: boolean; 
    page?: number; 
    limit?: number 
  }): Promise<{ schedules: ScheduleEntity[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { userId };
    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    const [schedules, total] = await this.repository.findAndCount({
      where,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
      relations: ['medication'],
    });

    return { schedules, total };
  }

  async findActiveSchedules(userId: string): Promise<ScheduleEntity[]> {
    const now = new Date();
    
    return this.repository
      .createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.medication', 'medication')
      .where('schedule.user_id = :userId', { userId })
      .andWhere('schedule.is_active = true')
      .andWhere('schedule.is_paused = false')
      .andWhere('(schedule.paused_until IS NULL OR schedule.paused_until < :now)', { now })
      .andWhere('(schedule.duration_end_date IS NULL OR schedule.duration_end_date >= :today)', { 
        today: now.toISOString().split('T')[0] 
      })
      .getMany();
  }

  async findDueReminders(beforeTime: Date): Promise<ScheduleEntity[]> {
    return this.repository
      .createQueryBuilder('schedule')
      .leftJoinAndSelect('schedule.medication', 'medication')
      .leftJoinAndSelect('schedule.user', 'user')
      .where('schedule.is_active = true')
      .andWhere('schedule.is_paused = false')
      .andWhere('(schedule.paused_until IS NULL OR schedule.paused_until < :now)', { now: new Date() })
      .andWhere('schedule.next_reminder_at <= :beforeTime', { beforeTime })
      .getMany();
  }

  async updateNextReminder(id: string, nextReminderAt: Date): Promise<void> {
    await this.repository.update(id, { 
      nextReminderAt,
      lastReminderAt: new Date(),
    });
  }

  async pauseSchedule(id: string, userId: string, until?: Date): Promise<ScheduleEntity> {
    const schedule = await this.findByIdAndUserOrFail(id, userId);
    schedule.isPaused = true;
    schedule.pausedUntil = until || null;
    return this.repository.save(schedule);
  }

  async resumeSchedule(id: string, userId: string): Promise<ScheduleEntity> {
    const schedule = await this.findByIdAndUserOrFail(id, userId);
    schedule.isPaused = false;
    schedule.pausedUntil = null;
    return this.repository.save(schedule);
  }

  // Alias for backward compatibility
  async findByUserId(userId: string): Promise<ScheduleEntity[]> {
    const result = await this.findByUser(userId, { isActive: true });
    return result.schedules;
  }

  // Alias for backward compatibility
  async findByMedicationId(medicationId: string): Promise<ScheduleEntity[]> {
    return this.findByMedication(medicationId);
  }
}

export const scheduleRepository = new ScheduleRepository();
