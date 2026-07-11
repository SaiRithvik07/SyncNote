import { Request, Response, NextFunction } from 'express';
import { VersionService } from '../services/versions';
import { z } from 'zod';

export const createVersionSchema = z.object({
  body: z.object({
    content: z.any(),
  }),
});

export class VersionController {
  static async create(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { documentId } = req.params;
      const { content } = req.body;
      const editedById = req.user!.id;

      const version = await VersionService.createVersion(
        documentId,
        content,
        editedById
      );

      res.status(201).json({
        status: 'success',
        data: {
          version,
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
      const { documentId } = req.params;

      const rawVersions = await VersionService.getVersions(documentId);
      
      const versions = rawVersions.map((v) => ({
        id: v.id,
        documentId: v.documentId,
        content: v.content,
        editedBy: v.editedBy?.name || 'Unknown',
        createdAt: v.createdAt,
      }));

      res.status(200).json({
        status: 'success',
        data: {
          versions,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async restore(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { documentId, id: versionId } = req.params;

      const document = await VersionService.restoreVersion(
        documentId,
        versionId
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
}