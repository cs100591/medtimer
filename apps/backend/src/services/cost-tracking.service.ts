import { MedicationRepository } from '../repositories/medication.repository';
import { logger } from '../utils/logger';

export interface InsurancePlan {
  id: string;
  userId: string;
  name: string;
  provider: string;
  memberId: string;
  groupNumber?: string;
  isPrimary: boolean;
  coverageType: 'full' | 'partial' | 'none';
  copayAmount?: number;
  deductible?: number;
  deductibleMet?: number;
  effectiveDate: Date;
  expirationDate?: Date;
}

export interface MedicationCost {
  medicationId: string;
  retailPrice: number;
  insurancePrice?: number;
  copay?: number;
  currency: string;
  pharmacyName?: string;
  lastUpdated: Date;
}

export interface ExpenseReport {
  userId: string;
  period: { start: Date; end: Date };
  totalRetailCost: number;
  totalOutOfPocket: number;
  totalInsurancePaid: number;
  byMedication: Array<{
    medicationId: string;
    medicationName: string;
    retailCost: number;
    outOfPocket: number;
    refillCount: number;
  }>;
  byMonth: Array<{
    month: string;
    retailCost: number;
    outOfPocket: number;
  }>;
  currency: string;
}

export class CostTrackingService {
  private insurancePlans: Map<string, InsurancePlan[]> = new Map();
  private medicationCosts: Map<string, MedicationCost> = new Map();

  constructor(private medicationRepo: MedicationRepository) {}

  async setMedicationCost(
    userId: string,
    medicationId: string,
    cost: Omit<MedicationCost, 'medicationId' | 'lastUpdated'>
  ): Promise<MedicationCost> {
    const medicationCost: MedicationCost = {
      ...cost,
      medicationId,
      lastUpdated: new Date(),
    };

    this.medicationCosts.set(medicationId, medicationCost);

    // Also update the medication entity
    await this.medicationRepo.update(medicationId, userId, {
      costPerUnit: cost.retailPrice,
      insuranceCopay: cost.copay,
      pharmacyName: cost.pharmacyName,
    });

    logger.info(`Updated cost for medication ${medicationId}`);
    return medicationCost;
  }

  async getMedicationCost(medicationId: string): Promise<MedicationCost | null> {
    const cached = this.medicationCosts.get(medicationId);
    if (cached) return cached;

    const medication = await this.medicationRepo.findById(medicationId);
    if (!medication || !medication.costPerUnit) return null;

    return {
      medicationId,
      retailPrice: medication.costPerUnit,
      copay: medication.insuranceCopay || undefined,
      currency: medication.currency || 'USD',
      pharmacyName: medication.pharmacyName || undefined,
      lastUpdated: medication.updatedAt,
    };
  }

  async addInsurancePlan(
    userId: string,
    plan: Omit<InsurancePlan, 'id' | 'userId'>
  ): Promise<InsurancePlan> {
    const plans = this.insurancePlans.get(userId) || [];

    // If this is primary, remove primary from others
    if (plan.isPrimary) {
      for (const p of plans) {
        p.isPrimary = false;
      }
    }

    const newPlan: InsurancePlan = {
      ...plan,
      id: `ins_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      userId,
    };

    plans.push(newPlan);
    this.insurancePlans.set(userId, plans);

    logger.info(`Added insurance plan for user ${userId}`);
    return newPlan;
  }

  async updateInsurancePlan(
    userId: string,
    planId: string,
    updates: Partial<Omit<InsurancePlan, 'id' | 'userId'>>
  ): Promise<InsurancePlan | null> {
    const plans = this.insurancePlans.get(userId) || [];
    const index = plans.findIndex(p => p.id === planId);

    if (index === -1) return null;

    if (updates.isPrimary) {
      for (const p of plans) {
        p.isPrimary = false;
      }
    }

    plans[index] = { ...plans[index], ...updates };
    this.insurancePlans.set(userId, plans);

    return plans[index];
  }

  async removeInsurancePlan(userId: string, planId: string): Promise<boolean> {
    const plans = this.insurancePlans.get(userId) || [];
    const index = plans.findIndex(p => p.id === planId);

    if (index === -1) return false;

    plans.splice(index, 1);
    this.insurancePlans.set(userId, plans);

    return true;
  }

  async getInsurancePlans(userId: string): Promise<InsurancePlan[]> {
    return this.insurancePlans.get(userId) || [];
  }

  async getPrimaryInsurance(userId: string): Promise<InsurancePlan | null> {
    const plans = await this.getInsurancePlans(userId);
    return plans.find(p => p.isPrimary) || null;
  }

  async calculateOutOfPocket(
    medicationId: string,
    userId: string,
    quantity: number = 1
  ): Promise<{ retail: number; outOfPocket: number; insurancePaid: number }> {
    const cost = await this.getMedicationCost(medicationId);
    if (!cost) {
      return { retail: 0, outOfPocket: 0, insurancePaid: 0 };
    }

    const retail = cost.retailPrice * quantity;
    const insurance = await this.getPrimaryInsurance(userId);

    if (!insurance || insurance.coverageType === 'none') {
      return { retail, outOfPocket: retail, insurancePaid: 0 };
    }

    let outOfPocket: number;
    if (cost.copay !== undefined) {
      outOfPocket = cost.copay;
    } else if (insurance.copayAmount !== undefined) {
      outOfPocket = insurance.copayAmount;
    } else if (insurance.coverageType === 'full') {
      outOfPocket = 0;
    } else {
      // Partial coverage - assume 20% copay
      outOfPocket = retail * 0.2;
    }

    const insurancePaid = retail - outOfPocket;

    return { retail, outOfPocket, insurancePaid: Math.max(0, insurancePaid) };
  }

  async generateExpenseReport(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ExpenseReport> {
    const medications = await this.medicationRepo.findByUserId(userId);
    
    let totalRetailCost = 0;
    let totalOutOfPocket = 0;
    let totalInsurancePaid = 0;

    const byMedication: ExpenseReport['byMedication'] = [];
    const byMonthMap = new Map<string, { retail: number; outOfPocket: number }>();

    for (const medication of medications) {
      if (!medication.isActive) continue;

      const cost = await this.getMedicationCost(medication.id);
      if (!cost) continue;

      // Estimate refills based on supply tracking
      const history = medication.getHistory();
      const refills = history.filter(
        (h: any) => 
          h.type === 'refill' && 
          new Date(h.changedAt) >= startDate && 
          new Date(h.changedAt) <= endDate
      );

      const refillCount = refills.length || 1;
      const { retail, outOfPocket, insurancePaid } = await this.calculateOutOfPocket(
        medication.id,
        userId,
        refillCount * 30 // Assume 30-day supply per refill
      );

      totalRetailCost += retail;
      totalOutOfPocket += outOfPocket;
      totalInsurancePaid += insurancePaid;

      byMedication.push({
        medicationId: medication.id,
        medicationName: medication.name,
        retailCost: retail,
        outOfPocket,
        refillCount,
      });

      // Group by month
      for (const refill of refills) {
        const refillDate = (refill as any).changedAt || (refill as any).timestamp || new Date();
        const monthKey = new Date(refillDate).toISOString().substring(0, 7);
        const existing = byMonthMap.get(monthKey) || { retail: 0, outOfPocket: 0 };
        existing.retail += retail / refillCount;
        existing.outOfPocket += outOfPocket / refillCount;
        byMonthMap.set(monthKey, existing);
      }
    }

    const byMonth = Array.from(byMonthMap.entries())
      .map(([month, data]) => ({ month, retailCost: data.retail, outOfPocket: data.outOfPocket }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      userId,
      period: { start: startDate, end: endDate },
      totalRetailCost: Math.round(totalRetailCost * 100) / 100,
      totalOutOfPocket: Math.round(totalOutOfPocket * 100) / 100,
      totalInsurancePaid: Math.round(totalInsurancePaid * 100) / 100,
      byMedication,
      byMonth,
      currency: 'USD',
    };
  }

  async getYearlyExpenseSummary(userId: string, year: number): Promise<{
    totalSpent: number;
    averageMonthly: number;
    highestMonth: { month: string; amount: number };
    lowestMonth: { month: string; amount: number };
  }> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    const report = await this.generateExpenseReport(userId, startDate, endDate);

    const monthlyAmounts = report.byMonth.map(m => ({
      month: m.month,
      amount: m.outOfPocket,
    }));

    const totalSpent = report.totalOutOfPocket;
    const averageMonthly = monthlyAmounts.length > 0
      ? totalSpent / monthlyAmounts.length
      : 0;

    const sorted = [...monthlyAmounts].sort((a, b) => b.amount - a.amount);
    const highestMonth = sorted[0] || { month: '', amount: 0 };
    const lowestMonth = sorted[sorted.length - 1] || { month: '', amount: 0 };

    return {
      totalSpent: Math.round(totalSpent * 100) / 100,
      averageMonthly: Math.round(averageMonthly * 100) / 100,
      highestMonth,
      lowestMonth,
    };
  }
}

// Factory function
export function createCostTrackingService(): CostTrackingService {
  const { medicationRepository } = require('../repositories/medication.repository');
  return new CostTrackingService(medicationRepository);
}

export const costTrackingService = createCostTrackingService();
