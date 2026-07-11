import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../config/db';
import { AuthError } from '../utils/errors';

interface DecodedToken {
  id: string;
  email: string;
  name: string;
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;

    // Check Authorization header first
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
    // Fallback to HttpOnly cookie
    else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      throw new AuthError('Access token is missing');
    }

    let decoded: DecodedToken;

    try {
      decoded = jwt.verify(token, env.JWT_SECRET) as DecodedToken;
    } catch {
      throw new AuthError('Invalid or expired access token');
    }

    const user = await prisma.user.findUnique({
      where: {
        id: decoded.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!user) {
      throw new AuthError(
        'The user belonging to this token no longer exists'
      );
    }

    req.user = user;

    next();
  } catch (error) {
    next(error);
  }
};