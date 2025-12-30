import { Response, NextFunction } from 'express';
import { medicationService } from '../services/medication.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { ValidationError } from '../middleware/error.middleware';

export class MedicationController {
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
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
        dosageAmount: parseFloat(dosageAmount),
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
        currentSupply: currentSupply ? parseInt(currentSupply, 10) : undefined,
        lowSupplyThreshold: lowSupplyThreshold ? parseInt(lowSupplyThreshold, 10) : undefined,
        costPerUnit: costPerUnit ? parseFloat(costPerUnit) : undefined,
        insuranceCopay: insuranceCopay ? parseFloat(insuranceCopay) : undefined,
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
      const userId = req.user!.userId;
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
      const userId = req.user!.userId;
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
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
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
      const userId = req.user!.userId;
      const { id } = req.params;
      const updateData = req.body;

      // Parse numeric fields if present
      if (updateData.dosageAmount) {
        updateData.dosageAmount = parseFloat(updateData.dosageAmount);
      }
      if (updateData.currentSupply) {
        updateData.currentSupply = parseInt(updateData.currentSupply, 10);
      }
      if (updateData.lowSupplyThreshold) {
        updateData.lowSupplyThreshold = parseInt(updateData.lowSupplyThreshold, 10);
      }
      if (updateData.costPerUnit) {
        updateData.costPerUnit = parseFloat(updateData.costPerUnit);
      }
      if (updateData.insuranceCopay) {
        updateData.insuranceCopay = parseFloat(updateData.insuranceCopay);
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
      const userId = req.user!.userId;
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
      const userId = req.user!.userId;
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
        parseInt(limit as string, 10)
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
      const userId = req.user!.userId;

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
      const userId = req.user!.userId;
      const { id } = req.params;
      const { change } = req.body;

      if (change === undefined) {
        throw new ValidationError('Supply change amount is required');
      }

      const medication = await medicationService.updateSupply(
        id, 
        userId, 
        parseInt(change, 10)
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
      const userId = req.user!.userId;
      const { id } = req.params;
      const { quantity } = req.body;

      if (!quantity) {
        throw new ValidationError('Refill quantity is required');
      }

      const medication = await medicationService.recordRefill(
        id, 
        userId, 
        parseInt(quantity, 10)
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
      const userId = req.user!.userId;

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
