import { AppDataSource, initializeDatabase } from '../data-source';
import { logger } from '../../utils/logger';

async function seedTest(): Promise<void> {
  try {
    await initializeDatabase();
    logger.info('Database connected for test seeding');
    
    // Add test seed data here
    logger.info('Test seed completed');
  } catch (error) {
    logger.error('Test seed failed:', error);
    throw error;
  } finally {
    await AppDataSource.destroy();
  }
}

seedTest().catch(console.error);
