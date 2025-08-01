import { Queue, Worker, Job } from 'bullmq';
import { getRedis } from '@/utils/redis';
import { logger } from '@/utils/logger';
import { prisma } from '@/utils/database';
import { io } from '../index';
import axios from 'axios';

export interface GenerationJobData {
  userId: string;
  promptId: string;
  outputId: string;
  type: 'IMAGE' | 'VIDEO';
  prompt: string;
  style: any;
  audioTrackId?: string;
}

let imageQueue: Queue<GenerationJobData>;
let videoQueue: Queue<GenerationJobData>;

export async function setupQueues() {
  const redis = getRedis();

  imageQueue = new Queue<GenerationJobData>('image-generation', {
    connection: redis,
    defaultJobOptions: {
      removeOnComplete: 10,
      removeOnFail: 20,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },
  });

  videoQueue = new Queue<GenerationJobData>('video-generation', {
    connection: redis,
    defaultJobOptions: {
      removeOnComplete: 5,
      removeOnFail: 10,
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    },
  });

  const imageWorker = new Worker<GenerationJobData>(
    'image-generation',
    async (job: Job<GenerationJobData>) => {
      return await processImageGeneration(job);
    },
    {
      connection: redis,
      concurrency: 2,
    }
  );

  const videoWorker = new Worker<GenerationJobData>(
    'video-generation',
    async (job: Job<GenerationJobData>) => {
      return await processVideoGeneration(job);
    },
    {
      connection: redis,
      concurrency: 1,
    }
  );

  imageWorker.on('completed', async (job) => {
    logger.info(`Image generation job ${job.id} completed`);
    await notifyUser(job.data.userId, 'generation-complete', {
      outputId: job.data.outputId,
      type: 'IMAGE',
      status: 'COMPLETED',
    });
  });

  imageWorker.on('failed', async (job, err) => {
    logger.error(`Image generation job ${job?.id} failed:`, err);
    if (job) {
      await handleJobFailure(job.data, err.message);
    }
  });

  videoWorker.on('completed', async (job) => {
    logger.info(`Video generation job ${job.id} completed`);
    await notifyUser(job.data.userId, 'generation-complete', {
      outputId: job.data.outputId,
      type: 'VIDEO',
      status: 'COMPLETED',
    });
  });

  videoWorker.on('failed', async (job, err) => {
    logger.error(`Video generation job ${job?.id} failed:`, err);
    if (job) {
      await handleJobFailure(job.data, err.message);
    }
  });

  logger.info('✅ Queues and workers set up successfully');
}

async function processImageGeneration(job: Job<GenerationJobData>): Promise<void> {
  const { userId, outputId, prompt, style } = job.data;
  
  try {
    await updateGenerationStatus(outputId, 'PROCESSING');
    
    const startTime = Date.now();
    
    const response = await axios.post(`${process.env.AI_SERVICE_URL}/generate/image`, {
      prompt,
      style,
      outputId,
    }, {
      timeout: 300000, // 5 minutes
    });

    const endTime = Date.now();
    const processingTime = Math.round((endTime - startTime) / 1000);

    await prisma.generatedOutput.update({
      where: { id: outputId },
      data: {
        status: 'COMPLETED',
        filePath: response.data.filePath,
        thumbnailPath: response.data.thumbnailPath,
        processingTime,
        metadata: response.data.metadata,
      },
    });

    await logUsage(userId, 'generate_image', processingTime, response.data.metadata);
    
  } catch (error: any) {
    logger.error('Image generation failed:', error);
    throw error;
  }
}

async function processVideoGeneration(job: Job<GenerationJobData>): Promise<void> {
  const { userId, outputId, prompt, style, audioTrackId } = job.data;
  
  try {
    await updateGenerationStatus(outputId, 'PROCESSING');
    
    const startTime = Date.now();
    
    const response = await axios.post(`${process.env.AI_SERVICE_URL}/generate/video`, {
      prompt,
      style,
      audioTrackId,
      outputId,
    }, {
      timeout: 600000, // 10 minutes
    });

    const endTime = Date.now();
    const processingTime = Math.round((endTime - startTime) / 1000);

    await prisma.generatedOutput.update({
      where: { id: outputId },
      data: {
        status: 'COMPLETED',
        filePath: response.data.filePath,
        thumbnailPath: response.data.thumbnailPath,
        processingTime,
        metadata: response.data.metadata,
      },
    });

    await logUsage(userId, 'generate_video', processingTime, response.data.metadata);
    
  } catch (error: any) {
    logger.error('Video generation failed:', error);
    throw error;
  }
}

async function updateGenerationStatus(outputId: string, status: 'PROCESSING' | 'COMPLETED' | 'FAILED') {
  await prisma.generatedOutput.update({
    where: { id: outputId },
    data: { status },
  });
}

async function handleJobFailure(jobData: GenerationJobData, errorMessage: string) {
  await prisma.generatedOutput.update({
    where: { id: jobData.outputId },
    data: {
      status: 'FAILED',
      errorMessage,
    },
  });

  await notifyUser(jobData.userId, 'generation-failed', {
    outputId: jobData.outputId,
    type: jobData.type,
    error: errorMessage,
  });
}

async function logUsage(userId: string, action: string, processingTime: number, metadata: any) {
  await prisma.usageLog.create({
    data: {
      userId,
      action,
      processingTime,
      metadata,
    },
  });
}

async function notifyUser(userId: string, event: string, data: any) {
  io.to(`user-${userId}`).emit(event, data);
}

export function addImageGenerationJob(data: GenerationJobData) {
  return imageQueue.add('generate-image', data, {
    priority: 10,
  });
}

export function addVideoGenerationJob(data: GenerationJobData) {
  return videoQueue.add('generate-video', data, {
    priority: 5,
  });
}

export { imageQueue, videoQueue };