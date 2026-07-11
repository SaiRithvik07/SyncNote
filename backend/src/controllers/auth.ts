import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth';
import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(50),
    email: z.string().trim().email(),
    password: z.string().min(4).max(100),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().email(),
    password: z.string().min(1),
  }),
});

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export class AuthController {
  static async register(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { name, email, password } = req.body;

      const { token, user } = await AuthService.register(
        name,
        email,
        password
      );

      res.cookie('token', token, cookieOptions);

      res.status(201).json({
        status: 'success',
        data: {
          user,
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { email, password } = req.body;

      const { token, user } = await AuthService.login(
        email,
        password
      );

      res.cookie('token', token, cookieOptions);

      res.status(200).json({
        status: 'success',
        data: {
          user,
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async logout(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      res.clearCookie('token', cookieOptions);

      res.status(200).json({
        status: 'success',
        message: 'Successfully logged out',
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMe(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      res.status(200).json({
        status: 'success',
        data: {
          user: req.user,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}