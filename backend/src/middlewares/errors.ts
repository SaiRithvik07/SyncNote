import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/errors';
import { env } from '../config/env';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): Response => {
  if (env.NODE_ENV === 'development') {
    console.error(err);
  }

  // Custom application errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      ...(err.statusCode === 400 &&
        'errors' in err && {
          errors: (err as AppError & { errors?: unknown }).errors,
        }),
    });
  }

  // Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      status: 'fail',
      message: 'Validation failed',
      errors: err.flatten().fieldErrors,
    });
  }

  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        return res.status(409).json({
          status: 'fail',
          message: `Duplicate value for: ${err.meta?.target}`,
        });

      case 'P2003':
        return res.status(400).json({
          status: 'fail',
          message: 'Foreign key constraint failed',
        });

      case 'P2025':
        return res.status(404).json({
          status: 'fail',
          message: 'Requested resource not found',
        });
    }
  }

  return res.status(500).json({
    status: 'error',
    message:
      env.NODE_ENV === 'production'
        ? 'Internal Server Error'
        : err.message,
    ...(env.NODE_ENV === 'development' && {
      stack: err.stack,
    }),
  });
};