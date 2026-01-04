import { Response, NextFunction } from 'express';
import { medicationService } from '../services/medication.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { ValidationError } from '../middleware/error.middleware';

// 安全的数字解析辅助函数
function safeParseFloat(value: any, fieldName: string): number {
  if (value === undefined || value === null || value === '') {
    throw new ValidationError(`${fieldName} is required`);
  }
  const parsed = parseFloat(value);
  if (isNaN(parsed)) {
    throw new ValidationError(`${fieldName} must be a valid number`);
  }
  return parsed;
}

function safeParseInt(value: any, fieldName: string): number {
  if (value === undefined || value === null || value === '') {
    throw new ValidationError(`${fieldName} is required`);
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new ValidationError(`${fieldName} must be a valid integer`);
  }
  return parsed;
}

function safeParseFloatOptional(value: any): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const parsed = parseFloat(value);
  return isNaN(parsed) ? undefined : parsed;
}

function safeParseIntOptional(value: any): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? undefined : parsed;
}

// 获取已验证的用户ID
function getUserId(req: AuthenticatedRequest): string {
  const userId = req.user?.userId;
  if (!userId) {
    throw new ValidationError('User authentication required');
  }
  return userId;
}

export class MedicationController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getUserId(req);
      const { 
        name, 
        genericName,
        dosageAmount, 
        dosageUnit, 
        dosageStrength,
        form,
        manufacturer,
        ndc,
        purpose,
        instructions,
        userNotes,
        isCritical,
        isRescueMedication,
        startDate,
        endDate,
        currentSupply,
        lowSupplyThreshold,
        costPerUnit,
        insuranceCopay,
      } = req.body;

      if (!name || !dosageAmount || !dosageUnit || !form) {
        throw new ValidationError('Name, dosageAmount, dosageUnit, and form are required');
      }

      const medication = await medicationService.createMedication(userId, {
        name,
        genericName,
        dosageAmount: safeParseFloat(dosageAmount, 'dosageAmount'),
        dosageUnit,
        dosageStrength,
        form,
        manufacturer,
        ndc,
        purpose,
        instructions,
        userNotes,
        isCritical,
        isRescueMedication,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        currentSupply: safeParseIntOptional(currentSupply),
        lowSupplyThreshold: safeParseIntOptional(lowSupplyThreshold),
        costPerUnit: safeParseFloatOptional(costPerUnit),
        insuranceCopay: safeParseFloatOptional(insuranceCopay),
      });

      res.status(201).json({
        success: true,
        data: medication,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getUserId(req);
      const { id } = req.params;

      const medication = await medicationService.getMedication(id, userId);

      res.json({
        success: true,
        data: medication,
      });
    } catch (error) {
      next(error);
    }
  }

  async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getUserId(req);
      const { 
        query, 
        isActive, 
        isCritical, 
        page = '1', 
        limit = '20' 
      } = req.query;

      const result = await medicationService.listMedications({
        userId,
        query: query as string,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        isCritical: isCritical === 'true' ? true : isCritical === 'false' ? false : undefined,
        page: safeParseIntOptional(page) || 1,
        limit: safeParseIntOptional(limit) || 20,
      });

      res.json({
        success: true,
        data: result.medications,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
          hasNext: result.page < result.totalPages,
          hasPrev: result.page > 1,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      const updateData = req.body;

      // Parse numeric fields if present
      if (updateData.dosageAmount !== undefined) {
        updateData.dosageAmount = safeParseFloat(updateData.dosageAmount, 'dosageAmount');
      }
      if (updateData.currentSupply !== undefined) {
        updateData.currentSupply = safeParseInt(updateData.currentSupply, 'currentSupply');
      }
      if (updateData.lowSupplyThreshold !== undefined) {
        updateData.lowSupplyThreshold = safeParseInt(updateData.lowSupplyThreshold, 'lowSupplyThreshold');
      }
      if (updateData.costPerUnit !== undefined) {
        updateData.costPerUnit = safeParseFloat(updateData.costPerUnit, 'costPerUnit');
      }
      if (updateData.insuranceCopay !== undefined) {
        updateData.insuranceCopay = safeParseFloat(updateData.insuranceCopay, 'insuranceCopay');
      }
      if (updateData.endDate) {
        updateData.endDate = new Date(updateData.endDate);
      }

      const medication = await medicationService.updateMedication(id, userId, updateData);

      res.json({
        success: true,
        data: medication,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getUserId(req);
      const { id } = req.params;

      await medicationService.deleteMedication(id, userId);

      res.json({
        success: true,
        data: { message: 'Medication deleted successfully' },
      });
    } catch (error) {
      next(error);
    }
  }

  async deactivate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getUserId(req);
      const { id } = req.params;

      const medication = await medicationService.deactivateMedication(id, userId);

      res.json({
        success: true,
        data: medication,
      });
    } catch (error) {
      next(error);
    }
  }

  async search(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { query, limit = '10' } = req.query;

      if (!query) {
        throw new ValidationError('Search query is required');
      }

      const medications = await medicationService.searchMedications(
        query as string,
        safeParseIntOptional(limit) || 10
      );

      res.json({
        success: true,
        data: medications,
      });
    } catch (error) {
      next(error);
    }
  }

  async getLowSupply(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getUserId(req);

      const medications = await medicationService.getLowSupplyMedications(userId);

      res.json({
        success: true,
        data: medications,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateSupply(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      const { change } = req.body;

      if (change === undefined) {
        throw new ValidationError('Supply change amount is required');
      }

      const medication = await medicationService.updateSupply(
        id, 
        userId, 
        safeParseInt(change, 'change')
      );

      res.json({
        success: true,
        data: medication,
      });
    } catch (error) {
      next(error);
    }
  }

  async recordRefill(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      const { quantity } = req.body;

      if (!quantity) {
        throw new ValidationError('Refill quantity is required');
      }

      const medication = await medicationService.recordRefill(
        id, 
        userId, 
        safeParseInt(quantity, 'quantity')
      );

      res.json({
        success: true,
        data: medication,
      });
    } catch (error) {
      next(error);
    }
  }

  async getEmergencyInfo(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getUserId(req);

      const emergencyInfo = await medicationService.getEmergencyInfo(userId);

      res.json({
        success: true,
        data: emergencyInfo,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const medicationController = new MedicationController();
