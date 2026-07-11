import { prisma } from '../config/db';
import { NotFoundError } from '../utils/errors';

export class DocumentService {
  static async createDocument(title: string, ownerId: string) {
    return prisma.document.create({
      data: {
        title: title.trim(),
        content: '',
        owner: {
          connect: { id: ownerId },
        },
      },
    });
  }

  static async getDocumentById(id: string) {
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        collaborators: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    return document;
  }

  static async getDocumentsForUser(userId: string) {
    const owned = await prisma.document.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: 'desc' },
    });

    const shared = await prisma.document.findMany({
      where: {
        collaborators: {
          some: { userId },
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return { owned, shared };
  }

  static async updateDocument(id: string, title?: string, content?: string) {
    // Verify document exists
    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    const updateData: { title?: string; content?: string } = {};
    if (title !== undefined) updateData.title = title.trim();
    if (content !== undefined) updateData.content = content;

    return prisma.document.update({
      where: { id },
      data: updateData,
    });
  }

  static async deleteDocument(id: string) {
    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    await prisma.document.delete({
      where: { id },
    });

    return { success: true };
  }
}
