import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from '../config';
import { UserEntity } from '../models/entities/User.entity';
import { MedicationEntity } from '../models/entities/Medication.entity';
import { ScheduleEntity } from '../models/entities/Schedule.entity';
import { AdherenceEntity } from '../models/entities/Adherence.entity';
import { CaregiverAccessEntity } from '../models/entities/Caregiver.entity';

const baseOptions: DataSourceOptions = {
  type: 'postgres',
  host: config.database.host,
  port: config.database.port,
  username: config.database.username,
  password: config.database.password,
  database: config.database.database,
  ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
  synchronize: false,
  logging: config.nodeEnv === 'development',
  entities: [UserEntity, MedicationEntity, ScheduleEntity, AdherenceEntity, CaregiverAccessEntity],
  migrations: [],
  subscribers: [],
};

export const AppDataSource = new DataSource(baseOptions);

export const initializeDatabase = async (): Promise<DataSource> => {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  return AppDataSource;
};

export const closeDatabase = async (): Promise<void> => {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
};
