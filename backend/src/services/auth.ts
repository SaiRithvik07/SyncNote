import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { AuthError, ConflictError } from '../utils/errors';

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
  };
  token: string;
}

export class AuthService {
  static async register(name: string, email: string, passwordSecret: string): Promise<AuthResponse> {
    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictError('An account with this email already exists');
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(passwordSecret, saltRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
      },
    });

    // Generate JWT
    const token = this.generateToken(user.id, user.email, user.name);

    return {
      user: { id: user.id, email: user.email, name: user.name },
      token,
    };
  }

  static async login(email: string, passwordSecret: string): Promise<AuthResponse> {
    const normalizedEmail = email.toLowerCase().trim();

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new AuthError('Invalid email or password');
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(passwordSecret, user.passwordHash);
    if (!isPasswordValid) {
      throw new AuthError('Invalid email or password');
    }

    // Generate JWT
    const token = this.generateToken(user.id, user.email, user.name);

    return {
      user: { id: user.id, email: user.email, name: user.name },
      token,
    };
  }

  private static generateToken(id: string, email: string, name: string): string {
    return jwt.sign({ id, email, name }, env.JWT_SECRET, {
      expiresIn: '7d',
    });
  }
}
