import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

import { errorHandler } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';
import { connectDatabase } from '@/utils/database';
import { setupRedis } from '@/utils/redis';
import { setupQueues } from '@/services/queueService';

import authRoutes from '@/routes/auth';
import userRoutes from '@/routes/users';
import promptRoutes from '@/routes/prompts';
import generateRoutes from '@/routes/generate';
import galleryRoutes from '@/routes/gallery';
import billingRoutes from '@/routes/billing';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Anime SaaS Platform API',
      version: '1.0.0',
      description: 'API for anime content generation platform',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server',
      },
    ],
  },
  apis: ['./src/routes/*.ts'],
};

const specs = swaggerJSDoc(swaggerOptions);

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(compression());
app.use(limiter);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/uploads', express.static('uploads'));

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/prompts', promptRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/billing', billingRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  socket.on('join-room', (userId: string) => {
    socket.join(`user-${userId}`);
    logger.info(`User ${userId} joined room`);
  });
  
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

export { io };

async function startServer() {
  try {
    await connectDatabase();
    await setupRedis();
    await setupQueues();
    
    server.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
      logger.info(`🔍 Health Check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}