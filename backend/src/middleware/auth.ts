import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '@/utils/database';
import { createError } from './errorHandler';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError('Authentication token required', 401);
    }

    const token = authHeader.substring(7);
    
    if (!process.env.JWT_SECRET) {
      throw createError('JWT secret not configured', 500);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as {
      userId: string;
      email: string;
      username: string;
    };

    const session = await prisma.userSession.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!session || !session.isActive || session.expiresAt < new Date()) {
      throw createError('Invalid or expired token', 401);
    }

    if (!session.user.isActive) {
      throw createError('Account is deactivated', 401);
    }

    req.user = {
      id: session.user.id,
      email: session.user.email,
      username: session.user.username,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(createError('Invalid token', 401));
    } else {
      next(error);
    }
  }
};

export const authorize = (...roles: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw createError('Authentication required', 401);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};