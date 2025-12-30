import { logger } from '../utils/logger';

export enum HealthDataType {
  SLEEP = 'sleep',
  ACTIVITY = 'activity',
  HEART_RATE = 'heart_rate',
  STEPS = 'steps',
  WEIGHT = 'weight',
}

export enum HealthProvider {
  APPLE_HEALTH = 'apple_health',
  GOOGLE_FIT = 'google_fit',
  FITBIT = 'fitbit',
  SAMSUNG_HEALTH = 'samsung_health',
}

export interface HealthPermission {
  dataType: HealthDataType;
  read: boolean;
  write: boolean;
  grantedAt?: Date;
}

export interface HealthConnection {
  userId: string;
  provider: HealthProvider;
  isConnected: boolean;
  permissions: HealthPermission[];
  lastSyncAt?: Date;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface SleepData {
  date: Date;
  bedtime: Date;
  wakeTime: Date;
  totalMinutes: number;
  deepSleepMinutes?: number;
  remSleepMinutes?: number;
  quality?: number; // 1-100
}

export interface ActivityData {
  date: Date;
  steps: number;
  activeMinutes: number;
  caloriesBurned?: number;
  distance?: number; // meters
}

export interface TimingOptimization {
  scheduleId: string;
  currentTime: string;
  suggestedTime: string;
  reason: string;
  basedOn: HealthDataType[];
  confidence: number;
}

export class HealthIntegrationService {
  private connections: Map<string, HealthConnection[]> = new Map();
  private sleepData: Map<string, SleepData[]> = new Map();
  private activityData: Map<string, ActivityData[]> = new Map();

  async connectProvider(
    userId: string,
    provider: HealthProvider,
    authCode: string
  ): Promise<HealthConnection> {
    // In production, this would exchange authCode for tokens
    const connection: HealthConnection = {
      userId,
      provider,
      isConnected: true,
      permissions: [],
      lastSyncAt: new Date(),
      // Tokens would be set from OAuth flow
    };

    const userConnections = this.connections.get(userId) || [];
    const existingIndex = userConnections.findIndex(c => c.provider === provider);
    
    if (existingIndex >= 0) {
      userConnections[existingIndex] = connection;
    } else {
      userConnections.push(connection);
    }
    
    this.connections.set(userId, userConnections);
    logger.info(`Connected ${provider} for user ${userId}`);

    return connection;
  }

  async disconnectProvider(userId: string, provider: HealthProvider): Promise<boolean> {
    const userConnections = this.connections.get(userId) || [];
    const index = userConnections.findIndex(c => c.provider === provider);

    if (index === -1) return false;

    userConnections.splice(index, 1);
    this.connections.set(userId, userConnections);

    logger.info(`Disconnected ${provider} for user ${userId}`);
    return true;
  }

  async getConnections(userId: string): Promise<HealthConnection[]> {
    return this.connections.get(userId) || [];
  }

  async isConnected(userId: string, provider?: HealthProvider): Promise<boolean> {
    const connections = await this.getConnections(userId);
    
    if (provider) {
      return connections.some(c => c.provider === provider && c.isConnected);
    }
    
    return connections.some(c => c.isConnected);
  }

  async requestPermissions(
    userId: string,
    provider: HealthProvider,
    permissions: Omit<HealthPermission, 'grantedAt'>[]
  ): Promise<HealthPermission[]> {
    const connections = this.connections.get(userId) || [];
    const connection = connections.find(c => c.provider === provider);

    if (!connection) {
      throw new Error(`Not connected to ${provider}`);
    }

    // In production, this would trigger native permission dialogs
    const grantedPermissions = permissions.map(p => ({
      ...p,
      grantedAt: new Date(),
    }));

    connection.permissions = grantedPermissions;
    this.connections.set(userId, connections);

    return grantedPermissions;
  }

  async syncSleepData(userId: string, provider: HealthProvider): Promise<SleepData[]> {
    const isConnected = await this.isConnected(userId, provider);
    if (!isConnected) {
      throw new Error(`Not connected to ${provider}`);
    }

    // In production, this would fetch from the health provider API
    // Simulating with mock data
    const mockSleepData: SleepData[] = [];
    const now = new Date();

    for (let i = 0; i < 7; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const bedtime = new Date(date);
      bedtime.setHours(22, 30, 0, 0);
      
      const wakeTime = new Date(date);
      wakeTime.setDate(wakeTime.getDate() + 1);
      wakeTime.setHours(6, 30, 0, 0);

      mockSleepData.push({
        date,
        bedtime,
        wakeTime,
        totalMinutes: 480, // 8 hours
        deepSleepMinutes: 90,
        remSleepMinutes: 120,
        quality: 75 + Math.floor(Math.random() * 20),
      });
    }

    const existing = this.sleepData.get(userId) || [];
    this.sleepData.set(userId, [...existing, ...mockSleepData]);

    logger.info(`Synced sleep data for user ${userId} from ${provider}`);
    return mockSleepData;
  }

  async syncActivityData(userId: string, provider: HealthProvider): Promise<ActivityData[]> {
    const isConnected = await this.isConnected(userId, provider);
    if (!isConnected) {
      throw new Error(`Not connected to ${provider}`);
    }

    // Mock activity data
    const mockActivityData: ActivityData[] = [];
    const now = new Date();

    for (let i = 0; i < 7; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      mockActivityData.push({
        date,
        steps: 5000 + Math.floor(Math.random() * 10000),
        activeMinutes: 30 + Math.floor(Math.random() * 60),
        caloriesBurned: 1800 + Math.floor(Math.random() * 500),
      });
    }

    const existing = this.activityData.get(userId) || [];
    this.activityData.set(userId, [...existing, ...mockActivityData]);

    logger.info(`Synced activity data for user ${userId} from ${provider}`);
    return mockActivityData;
  }

  async getSleepData(userId: string, days: number = 7): Promise<SleepData[]> {
    const data = this.sleepData.get(userId) || [];
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    return data
      .filter(d => d.date >= cutoff)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  async getActivityData(userId: string, days: number = 7): Promise<ActivityData[]> {
    const data = this.activityData.get(userId) || [];
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    return data
      .filter(d => d.date >= cutoff)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  async getAverageSleepSchedule(userId: string): Promise<{
    avgBedtime: string;
    avgWakeTime: string;
    avgDuration: number;
  } | null> {
    const sleepData = await this.getSleepData(userId, 14);
    if (sleepData.length === 0) return null;

    let totalBedtimeMinutes = 0;
    let totalWakeTimeMinutes = 0;
    let totalDuration = 0;

    for (const data of sleepData) {
      const bedtimeMinutes = data.bedtime.getHours() * 60 + data.bedtime.getMinutes();
      const wakeTimeMinutes = data.wakeTime.getHours() * 60 + data.wakeTime.getMinutes();
      
      totalBedtimeMinutes += bedtimeMinutes;
      totalWakeTimeMinutes += wakeTimeMinutes;
      totalDuration += data.totalMinutes;
    }

    const avgBedtimeMinutes = Math.round(totalBedtimeMinutes / sleepData.length);
    const avgWakeTimeMinutes = Math.round(totalWakeTimeMinutes / sleepData.length);
    const avgDuration = Math.round(totalDuration / sleepData.length);

    const formatTime = (minutes: number) => {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    return {
      avgBedtime: formatTime(avgBedtimeMinutes),
      avgWakeTime: formatTime(avgWakeTimeMinutes),
      avgDuration,
    };
  }

  async generateTimingOptimizations(
    userId: string,
    schedules: Array<{ id: string; time: string; medicationName: string }>
  ): Promise<TimingOptimization[]> {
    const optimizations: TimingOptimization[] = [];
    const sleepSchedule = await this.getAverageSleepSchedule(userId);

    if (!sleepSchedule) {
      return optimizations;
    }

    for (const schedule of schedules) {
      const [hours, minutes] = schedule.time.split(':').map(Number);
      const scheduleMinutes = hours * 60 + minutes;

      const [wakeHours, wakeMinutes] = sleepSchedule.avgWakeTime.split(':').map(Number);
      const wakeTimeMinutes = wakeHours * 60 + wakeMinutes;

      const [bedHours, bedMinutes] = sleepSchedule.avgBedtime.split(':').map(Number);
      const bedTimeMinutes = bedHours * 60 + bedMinutes;

      // Check if medication is scheduled during sleep
      if (scheduleMinutes > bedTimeMinutes || scheduleMinutes < wakeTimeMinutes - 30) {
        // Suggest moving to after wake time
        const suggestedMinutes = wakeTimeMinutes + 30;
        const suggestedTime = `${Math.floor(suggestedMinutes / 60).toString().padStart(2, '0')}:${(suggestedMinutes % 60).toString().padStart(2, '0')}`;

        optimizations.push({
          scheduleId: schedule.id,
          currentTime: schedule.time,
          suggestedTime,
          reason: `Your ${schedule.medicationName} is scheduled during your typical sleep time. Consider taking it after you wake up.`,
          basedOn: [HealthDataType.SLEEP],
          confidence: 0.8,
        });
      }
    }

    return optimizations;
  }

  // Check if service works without health integration
  async canOperateWithoutIntegration(): Promise<boolean> {
    return true; // Core functionality always works
  }
}

export const healthIntegrationService = new HealthIntegrationService();
