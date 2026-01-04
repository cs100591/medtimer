import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { userRepository } from '../repositories/user.repository';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { ValidationError } from '../middleware/error.middleware';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, firstName, lastName, dateOfBirth, phone } = req.body;

      if (!email || !password || !firstName || !lastName) {
        throw new ValidationError('Email, password, firstName, and lastName are required');
      }

      const { user, tokens } = await authService.register({
        email,
        password,
        firstName,
        lastName,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        phone,
      });

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            isVerified: user.isVerified,
            createdAt: user.createdAt,
          },
          tokens,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new ValidationError('Email and password are required');
      }

      const { user, tokens } = await authService.login({ email, password });

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            isVerified: user.isVerified,
            lastLoginAt: user.lastLoginAt,
          },
          tokens,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new ValidationError('Refresh token is required');
      }

      const tokens = await authService.refreshTokens(refreshToken);

      res.json({
        success: true,
        data: tokens,
      });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user?.userId;
      if (!userId) {
        throw new ValidationError('User authentication required');
      }

      if (!currentPassword || !newPassword) {
        throw new ValidationError('Current password and new password are required');
      }

      await authService.changePassword(userId, currentPassword, newPassword);

      res.json({
        success: true,
        data: { message: 'Password changed successfully' },
      });
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new ValidationError('User authentication required');
      }
      const user = await userRepository.findByIdOrFail(userId);

      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          dateOfBirth: user.dateOfBirth,
          phone: user.getPhone(),
          language: user.language,
          timezone: user.timezone,
          isVerified: user.isVerified,
          preferences: {
            notifications: {
              pushEnabled: user.pushEnabled,
              smsEnabled: user.smsEnabled,
              emailEnabled: user.emailEnabled,
              escalationEnabled: user.escalationEnabled,
            },
            accessibility: {
              highContrastMode: user.highContrastMode,
              largeText: user.largeText,
              fontSize: user.fontSize,
              voiceEnabled: user.voiceEnabled,
            },
          },
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new ValidationError('User authentication required');
      }
      const updateData = req.body;

      const user = await userRepository.update(userId, updateData);

      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          updatedAt: user.updatedAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteAccount(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new ValidationError('User authentication required');
      }
      
      await userRepository.delete(userId);

      res.json({
        success: true,
        data: { message: 'Account deleted successfully' },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
