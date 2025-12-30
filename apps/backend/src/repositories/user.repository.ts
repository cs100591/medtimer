import { Repository } from 'typeorm';
import { AppDataSource } from '../database/data-source';
import { UserEntity } from '../models/entities/User.entity';
import { NotFoundError, ConflictError } from '../middleware/error.middleware';

export interface CreateUserData {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: Date;
  phone?: string;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: Date;
  phone?: string;
  language?: string;
  timezone?: string;
  pushEnabled?: boolean;
  smsEnabled?: boolean;
  emailEnabled?: boolean;
  highContrastMode?: boolean;
  largeText?: boolean;
  fontSize?: number;
  voiceEnabled?: boolean;
}

export class UserRepository {
  private repository: Repository<UserEntity>;

  constructor() {
    this.repository = AppDataSource.getRepository(UserEntity);
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByIdOrFail(id: string): Promise<UserEntity> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundError(`User with id ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.repository.findOne({ where: { email: email.toLowerCase() } });
  }

  async create(data: CreateUserData): Promise<UserEntity> {
    const existingUser = await this.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    const user = this.repository.create({
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: data.dateOfBirth || null,
    });

    if (data.phone) {
      user.setPhone(data.phone);
    }

    return this.repository.save(user);
  }

  async update(id: string, data: UpdateUserData): Promise<UserEntity> {
    const user = await this.findByIdOrFail(id);

    if (data.firstName !== undefined) user.firstName = data.firstName;
    if (data.lastName !== undefined) user.lastName = data.lastName;
    if (data.dateOfBirth !== undefined) user.dateOfBirth = data.dateOfBirth;
    if (data.phone !== undefined) user.setPhone(data.phone);
    if (data.language !== undefined) user.language = data.language as any;
    if (data.timezone !== undefined) user.timezone = data.timezone;
    if (data.pushEnabled !== undefined) user.pushEnabled = data.pushEnabled;
    if (data.smsEnabled !== undefined) user.smsEnabled = data.smsEnabled;
    if (data.emailEnabled !== undefined) user.emailEnabled = data.emailEnabled;
    if (data.highContrastMode !== undefined) user.highContrastMode = data.highContrastMode;
    if (data.largeText !== undefined) user.largeText = data.largeText;
    if (data.fontSize !== undefined) user.fontSize = data.fontSize;
    if (data.voiceEnabled !== undefined) user.voiceEnabled = data.voiceEnabled;

    return this.repository.save(user);
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.repository.update(id, { lastLoginAt: new Date() });
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await this.repository.update(id, { passwordHash });
  }

  async verifyUser(id: string): Promise<void> {
    await this.repository.update(id, { isVerified: true });
  }

  async deactivate(id: string): Promise<void> {
    await this.repository.update(id, { isActive: false });
  }

  async delete(id: string): Promise<void> {
    const user = await this.findByIdOrFail(id);
    await this.repository.remove(user);
  }

  async findAll(options?: { page?: number; limit?: number }): Promise<{
    users: UserEntity[];
    total: number;
  }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const [users, total] = await this.repository.findAndCount({
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { users, total };
  }
}

export const userRepository = new UserRepository();
