import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { userRepository, CreateUserData } from '../repositories/user.repository';
import { UserEntity } from '../models/entities/User.entity';
import { AuthenticationError, ValidationError } from '../middleware/error.middleware';

export interface TokenPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: Date;
  phone?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

const SALT_ROUNDS = 12;

export class AuthService {
  async register(input: RegisterInput): Promise<{ user: UserEntity; tokens: AuthTokens }> {
    this.validatePassword(input.password);

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

    const userData: CreateUserData = {
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      dateOfBirth: input.dateOfBirth,
      phone: input.phone,
    };

    const user = await userRepository.create(userData);
    const tokens = this.generateTokens(user);

    return { user, tokens };
  }

  async login(input: LoginInput): Promise<{ user: UserEntity; tokens: AuthTokens }> {
    const user = await userRepository.findByEmail(input.email);
    
    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new AuthenticationError('Account is deactivated');
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
    
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid email or password');
    }

    await userRepository.updateLastLogin(user.id);
    const tokens = this.generateTokens(user);

    return { user, tokens };
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    try {
      const payload = jwt.verify(refreshToken, config.jwt.secret) as TokenPayload;
      
      if (payload.type !== 'refresh') {
        throw new AuthenticationError('Invalid token type');
      }

      const user = await userRepository.findById(payload.userId);
      
      if (!user || !user.isActive) {
        throw new AuthenticationError('User not found or inactive');
      }

      return this.generateTokens(user);
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError('Refresh token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthenticationError('Invalid refresh token');
      }
      throw error;
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await userRepository.findByIdOrFail(userId);

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    
    if (!isCurrentPasswordValid) {
      throw new AuthenticationError('Current password is incorrect');
    }

    this.validatePassword(newPassword);
    const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    
    await userRepository.updatePassword(userId, newPasswordHash);
  }

  verifyAccessToken(token: string): TokenPayload {
    try {
      const payload = jwt.verify(token, config.jwt.secret) as TokenPayload;
      
      if (payload.type !== 'access') {
        throw new AuthenticationError('Invalid token type');
      }

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError('Access token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthenticationError('Invalid access token');
      }
      throw error;
    }
  }

  private generateTokens(user: UserEntity): AuthTokens {
    const accessPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      type: 'access',
    };

    const refreshPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      type: 'refresh',
    };

    // Parse expiresIn to seconds for JWT
    const accessExpiresInSeconds = this.parseExpiresIn(config.jwt.expiresIn);
    const refreshExpiresInSeconds = this.parseExpiresIn(config.jwt.refreshExpiresIn);

    const accessToken = jwt.sign(accessPayload, config.jwt.secret, {
      expiresIn: accessExpiresInSeconds,
    });

    const refreshToken = jwt.sign(refreshPayload, config.jwt.secret, {
      expiresIn: refreshExpiresInSeconds,
    });

    return { accessToken, refreshToken, expiresIn: accessExpiresInSeconds };
  }

  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 3600; // Default 1 hour

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 3600;
    }
  }

  private validatePassword(password: string): void {
    if (password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      throw new ValidationError('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      throw new ValidationError('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      throw new ValidationError('Password must contain at least one number');
    }
  }
}

export const authService = new AuthService();
