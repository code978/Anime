import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event',
      level: 'error',
    },
    {
      emit: 'event',
      level: 'info',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ],
});

prisma.$on('query', (e) => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug(`Query: ${e.query}`);
    logger.debug(`Params: ${e.params}`);
    logger.debug(`Duration: ${e.duration}ms`);
  }
});

prisma.$on('error', (e) => {
  logger.error('Prisma Error:', e);
});

prisma.$on('info', (e) => {
  logger.info('Prisma Info:', e.message);
});

prisma.$on('warn', (e) => {
  logger.warn('Prisma Warning:', e.message);
});

export async function connectDatabase() {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected successfully');
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    throw error;
  }
}

export async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
    logger.info('✅ Database disconnected successfully');
  } catch (error) {
    logger.error('❌ Database disconnection failed:', error);
    throw error;
  }
}

export { prisma };

process.on('beforeExit', async () => {
  await disconnectDatabase();
});