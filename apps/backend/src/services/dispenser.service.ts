import { logger } from '../utils/logger';

// Smart pill dispenser integration service
export interface DispenserDevice {
  id: string;
  userId: string;
  name: string;
  brand: string;
  model: string;
  connectionType: 'bluetooth' | 'wifi';
  macAddress?: string;
  ipAddress?: string;
  status: 'connected' | 'disconnected' | 'error';
  batteryLevel?: number;
  lastSeen: Date;
  compartments: DispenserCompartment[];
}

export interface DispenserCompartment {
  id: number;
  medicationId?: string;
  medicationName?: string;
  pillCount: number;
  capacity: number;
  lastDispensed?: Date;
}

export interface DispenserEvent {
  id: string;
  deviceId: string;
  type: 'dispense' | 'refill' | 'error' | 'low_supply' | 'missed';
  compartmentId: number;
  medicationId?: string;
  timestamp: Date;
  details?: Record<string, unknown>;
}

export class DispenserService {
  private devices: Map<string, DispenserDevice> = new Map();
  private events: DispenserEvent[] = [];
  private eventHandlers: Map<string, (event: DispenserEvent) => void> = new Map();

  // Register a new dispenser device
  async registerDevice(
    userId: string,
    deviceInfo: Omit<DispenserDevice, 'id' | 'userId' | 'status' | 'lastSeen' | 'compartments'>
  ): Promise<DispenserDevice> {
    const device: DispenserDevice = {
      ...deviceInfo,
      id: `disp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      userId,
      status: 'disconnected',
      lastSeen: new Date(),
      compartments: this.initializeCompartments(deviceInfo.brand),
    };

    this.devices.set(device.id, device);
    logger.info(`Registered dispenser device ${device.id} for user ${userId}`);
    
    return device;
  }

  // Initialize compartments based on device brand
  private initializeCompartments(brand: string): DispenserCompartment[] {
    // Different brands have different compartment configurations
    const compartmentCounts: Record<string, number> = {
      'hero': 10,
      'medminder': 28,
      'philips': 6,
      'default': 7,
    };

    const count = compartmentCounts[brand.toLowerCase()] || compartmentCounts['default'];
    return Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      pillCount: 0,
      capacity: 30,
    }));
  }

  // Connect to a dispenser device
  async connectDevice(deviceId: string): Promise<boolean> {
    const device = this.devices.get(deviceId);
    if (!device) return false;

    // Simulate connection attempt
    device.status = 'connected';
    device.lastSeen = new Date();
    this.devices.set(deviceId, device);

    logger.info(`Connected to dispenser ${deviceId}`);
    return true;
  }

  // Disconnect from a dispenser device
  async disconnectDevice(deviceId: string): Promise<boolean> {
    const device = this.devices.get(deviceId);
    if (!device) return false;

    device.status = 'disconnected';
    this.devices.set(deviceId, device);

    logger.info(`Disconnected from dispenser ${deviceId}`);
    return true;
  }

  // Get user's registered devices
  async getUserDevices(userId: string): Promise<DispenserDevice[]> {
    return Array.from(this.devices.values()).filter(d => d.userId === userId);
  }

  // Assign medication to a compartment
  async assignMedication(
    deviceId: string,
    compartmentId: number,
    medicationId: string,
    medicationName: string
  ): Promise<boolean> {
    const device = this.devices.get(deviceId);
    if (!device) return false;

    const compartment = device.compartments.find(c => c.id === compartmentId);
    if (!compartment) return false;

    compartment.medicationId = medicationId;
    compartment.medicationName = medicationName;
    this.devices.set(deviceId, device);

    logger.info(`Assigned medication ${medicationId} to compartment ${compartmentId} on device ${deviceId}`);
    return true;
  }

  // Record a dispense event (called when dispenser dispenses medication)
  async recordDispenseEvent(
    deviceId: string,
    compartmentId: number,
    pillsDispensed: number = 1
  ): Promise<DispenserEvent | null> {
    const device = this.devices.get(deviceId);
    if (!device) return null;

    const compartment = device.compartments.find(c => c.id === compartmentId);
    if (!compartment) return null;

    // Update compartment state
    compartment.pillCount = Math.max(0, compartment.pillCount - pillsDispensed);
    compartment.lastDispensed = new Date();

    const event: DispenserEvent = {
      id: `evt_${Date.now()}`,
      deviceId,
      type: 'dispense',
      compartmentId,
      medicationId: compartment.medicationId,
      timestamp: new Date(),
      details: { pillsDispensed },
    };

    this.events.push(event);
    this.devices.set(deviceId, device);

    // Trigger event handlers
    this.notifyEventHandlers(event);

    // Check for low supply
    if (compartment.pillCount <= 5) {
      await this.recordLowSupplyEvent(deviceId, compartmentId);
    }

    logger.info(`Recorded dispense event for device ${deviceId}, compartment ${compartmentId}`);
    return event;
  }

  // Record a refill event
  async recordRefillEvent(
    deviceId: string,
    compartmentId: number,
    pillsAdded: number
  ): Promise<DispenserEvent | null> {
    const device = this.devices.get(deviceId);
    if (!device) return null;

    const compartment = device.compartments.find(c => c.id === compartmentId);
    if (!compartment) return null;

    compartment.pillCount = Math.min(compartment.capacity, compartment.pillCount + pillsAdded);

    const event: DispenserEvent = {
      id: `evt_${Date.now()}`,
      deviceId,
      type: 'refill',
      compartmentId,
      medicationId: compartment.medicationId,
      timestamp: new Date(),
      details: { pillsAdded, newTotal: compartment.pillCount },
    };

    this.events.push(event);
    this.devices.set(deviceId, device);
    this.notifyEventHandlers(event);

    return event;
  }

  // Record low supply warning
  private async recordLowSupplyEvent(deviceId: string, compartmentId: number): Promise<void> {
    const device = this.devices.get(deviceId);
    if (!device) return;

    const compartment = device.compartments.find(c => c.id === compartmentId);
    if (!compartment) return;

    const event: DispenserEvent = {
      id: `evt_${Date.now()}`,
      deviceId,
      type: 'low_supply',
      compartmentId,
      medicationId: compartment.medicationId,
      timestamp: new Date(),
      details: { remainingPills: compartment.pillCount },
    };

    this.events.push(event);
    this.notifyEventHandlers(event);
  }

  // Get device events
  async getDeviceEvents(deviceId: string, limit: number = 50): Promise<DispenserEvent[]> {
    return this.events
      .filter(e => e.deviceId === deviceId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // Register event handler for auto-logging
  registerEventHandler(handlerId: string, handler: (event: DispenserEvent) => void): void {
    this.eventHandlers.set(handlerId, handler);
  }

  // Unregister event handler
  unregisterEventHandler(handlerId: string): void {
    this.eventHandlers.delete(handlerId);
  }

  private notifyEventHandlers(event: DispenserEvent): void {
    for (const handler of this.eventHandlers.values()) {
      try {
        handler(event);
      } catch (e) {
        logger.error('Error in dispenser event handler', e);
      }
    }
  }

  // Check device health and handle malfunctions
  async checkDeviceHealth(deviceId: string): Promise<{
    healthy: boolean;
    issues: string[];
  }> {
    const device = this.devices.get(deviceId);
    if (!device) {
      return { healthy: false, issues: ['Device not found'] };
    }

    const issues: string[] = [];

    if (device.status !== 'connected') {
      issues.push('Device is not connected');
    }

    if (device.batteryLevel !== undefined && device.batteryLevel < 20) {
      issues.push(`Low battery: ${device.batteryLevel}%`);
    }

    const lastSeenMinutes = (Date.now() - device.lastSeen.getTime()) / 60000;
    if (lastSeenMinutes > 30) {
      issues.push('Device has not reported in over 30 minutes');
    }

    return {
      healthy: issues.length === 0,
      issues,
    };
  }

  // Remove a device
  async removeDevice(deviceId: string): Promise<boolean> {
    return this.devices.delete(deviceId);
  }
}

// Factory function
export function createDispenserService(): DispenserService {
  return new DispenserService();
}

export const dispenserService = createDispenserService();
