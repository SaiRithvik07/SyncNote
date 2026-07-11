import { Request, Response, NextFunction } from 'express';
import { CollaboratorService } from '../services/collaborators';
import { z } from 'zod';
import { Role } from '@prisma/client';

export const addCollaboratorSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email('Please enter a valid email address'),
    role: z.nativeEnum(Role),
  }),
});

export const updateCollaboratorSchema = z.object({
  body: z.object({
    role: z.nativeEnum(Role),
  }),
});

export class CollaboratorController {
  static async add(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { documentId } = req.params;
      const { email, role } = req.body;

      const collaborator = await CollaboratorService.addCollaborator(
        documentId,
        email,
        role
      );

      res.status(201).json({
        status: 'success',
        data: {
          collaborator,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { documentId, userId } = req.params;
      const { role } = req.body;

      const collaborator =
        await CollaboratorService.updateCollaboratorRole(
          documentId,
          userId,
          role
        );

      res.status(200).json({
        status: 'success',
        data: {
          collaborator,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async remove(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { documentId, userId } = req.params;

      await CollaboratorService.removeCollaborator(
        documentId,
        userId
      );

      res.status(200).json({
        status: 'success',
        message: 'Collaborator removed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAll(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { documentId } = req.params;

      const collaborators =
        await CollaboratorService.getCollaborators(documentId);

      res.status(200).json({
        status: 'success',
        data: {
          collaborators,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}