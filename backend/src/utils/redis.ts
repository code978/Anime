import Redis from 'ioredis';
import { logger } from './logger';

let redis: Redis;

export async function setupRedis() {
  try {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    redis.on('connect', () => {
      logger.info('✅ Redis connected successfully');
    });

    redis.on('error', (error) => {
      logger.error('❌ Redis connection error:', error);
    });

    redis.on('ready', () => {
      logger.info('✅ Redis is ready');
    });

    redis.on('reconnecting', () => {
      logger.warn('🔄 Redis reconnecting...');
    });

    await redis.connect();
    
    return redis;
  } catch (error) {
    logger.error('❌ Redis setup failed:', error);
    throw error;
  }
}

export function getRedis(): Redis {
  if (!redis) {
    throw new Error('Redis not initialized. Call setupRedis() first.');
  }
  return redis;
}

export async function disconnectRedis() {
  if (redis) {
    await redis.quit();
    logger.info('✅ Redis disconnected successfully');
  }
}

process.on('beforeExit', async () => {
  await disconnectRedis();
});