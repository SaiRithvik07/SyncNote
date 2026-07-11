import { prisma } from '../config/db';
import { NotFoundError } from '../utils/errors';

export class VersionService {
  static async createVersion(documentId: string, content: string, editedBy: string) {
    // Check if document exists
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    return prisma.version.create({
      data: {
        content: content as any,
        editedById: editedBy,
        documentId: documentId,
      },
    });
  }

  static async getVersions(documentId: string) {
    return prisma.version.findMany({
      where: { documentId },
      include: {
        editedBy: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async restoreVersion(documentId: string, versionId: string) {
    return prisma.$transaction(async (tx) => {
      // Find the version snapshot
      const version = await tx.version.findUnique({
        where: { id: versionId },
      });

      if (!version || version.documentId !== documentId) {
        throw new NotFoundError('Version snapshot not found for this document');
      }

      // Update the document's main content
      const updatedDocument = await tx.document.update({
        where: { id: documentId },
        data: {
          content: version.content as any,
        },
      });

      return updatedDocument;
    });
  }
}
