import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { ForbiddenError, NotFoundError } from '../utils/errors';
import { Role } from '@prisma/client';

const ROLE_WEIGHTS = {
  OWNER: 3,
  EDITOR: 2,
  VIEWER: 1,
} as const;

type UserRole = 'OWNER' | Role;

export const authorize = (requiredRole: UserRole) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }

      const userId = req.user.id;

      const documentId =
        req.params.documentId ??
        req.params.id ??
        req.body.documentId;

      if (!documentId) {
        throw new NotFoundError('Document ID not specified');
      }

      const document = await prisma.document.findUnique({
        where: {
          id: documentId,
        },
        select: {
          ownerId: true,
        },
      });

      if (!document) {
        throw new NotFoundError('Document not found');
      }

      let userRole: UserRole | null = null;

      // Owner check
      if (document.ownerId === userId) {
        userRole = 'OWNER';
      } else {
        const collaborator = await prisma.collaborator.findUnique({
          where: {
            documentId_userId: {
              documentId,
              userId,
            },
          },
          select: {
            role: true,
          },
        });

        if (collaborator) {
          userRole = collaborator.role;
        }
      }

      if (!userRole) {
        throw new ForbiddenError(
          'You do not have access to this document'
        );
      }

      if (
        ROLE_WEIGHTS[userRole] <
        ROLE_WEIGHTS[requiredRole]
      ) {
        throw new ForbiddenError(
          'You do not have sufficient permissions to perform this action'
        );
      }

      (req as any).documentRole = userRole;

      next();
    } catch (error) {
      next(error);
    }
  };
};