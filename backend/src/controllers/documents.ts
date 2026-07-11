import { Request, Response, NextFunction } from 'express';
import { DocumentService } from '../services/documents';
import { z } from 'zod';

export const createDocumentSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1, 'Title cannot be empty').max(255),
  }),
});

export const updateDocumentSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1, 'Title cannot be empty').max(255).optional(),
    content: z.any().optional(),
  }),
});

export class DocumentController {
  static async create(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { title } = req.body;
      const ownerId = req.user!.id;

      const document = await DocumentService.createDocument(
        title,
        ownerId
      );

      res.status(201).json({
        status: 'success',
        data: {
          document,
        },
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
      const userId = req.user!.id;

      const result = await DocumentService.getDocumentsForUser(userId);

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getOne(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const document = await DocumentService.getDocumentById(req.params.id);

      res.status(200).json({
        status: 'success',
        data: {
          document,
          role: (req as any).documentRole,
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
      const { title, content } = req.body;

      const document = await DocumentService.updateDocument(
        req.params.id,
        title,
        content
      );

      res.status(200).json({
        status: 'success',
        data: {
          document,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      await DocumentService.deleteDocument(req.params.id);

      res.status(200).json({
        status: 'success',
        message: 'Document deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}