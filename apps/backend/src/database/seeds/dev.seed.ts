import { AppDataSource, initializeDatabase } from '../data-source';
import { logger } from '../../utils/logger';

async function seedDevelopment(): Promise<void> {
  try {
    await initializeDatabase();
    logger.info('Database connected for seeding');
    
    // Add development seed data here
    logger.info('Development seed completed');
  } catch (error) {
    logger.error('Seed failed:', error);
    throw error;
  } finally {
    await AppDataSource.destroy();
  }
}

seedDevelopment().catch(console.error);
