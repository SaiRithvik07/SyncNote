import { Request, Response, NextFunction } from 'express';
import { ZodTypeAny, ZodError } from 'zod';
import { ValidationError } from '../utils/errors';

export const validate =
  (schema: ZodTypeAny) =>
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors: Record<string, string[]> = {};

        error.issues.forEach((issue) => {
          const path = issue.path.slice(1).join('.');

          if (!formattedErrors[path]) {
            formattedErrors[path] = [];
          }

          formattedErrors[path].push(issue.message);
        });

        return next(
          new ValidationError(
            'Validation failed',
            formattedErrors
          )
        );
      }

      next(error);
    }
  };