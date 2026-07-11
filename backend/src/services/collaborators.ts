import { Role } from '@prisma/client';
import { prisma } from '../config/db';
import { NotFoundError, ValidationError } from '../utils/errors';

export class CollaboratorService {
  static async addCollaborator(documentId: string, email: string, role: Role) {
    const normalizedEmail = email.toLowerCase().trim();

    // Find the user by email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new NotFoundError('User with this email not found');
    }

    // Verify document exists and fetch owner
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    // A document owner cannot be added as a collaborator
    if (document.ownerId === user.id) {
      throw new ValidationError('The owner of the document cannot be added as a collaborator');
    }

    // Add or update collaborator
    return prisma.collaborator.upsert({
      where: {
        documentId_userId: {
          documentId,
          userId: user.id,
        },
      },
      update: { role },
      create: {
        role,
        document: {
          connect: { id: documentId },
        },
        user: {
          connect: { id: user.id },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  static async removeCollaborator(documentId: string, userId: string) {
    // Check if collaborator exists
    const collaborator = await prisma.collaborator.findUnique({
      where: {
        documentId_userId: {
          documentId,
          userId,
        },
      },
    });

    if (!collaborator) {
      throw new NotFoundError('Collaborator not found on this document');
    }

    await prisma.collaborator.delete({
      where: {
        documentId_userId: {
          documentId,
          userId,
        },
      },
    });

    return { success: true };
  }

  static async updateCollaboratorRole(documentId: string, userId: string, role: Role) {
    // Check if collaborator exists
    const collaborator = await prisma.collaborator.findUnique({
      where: {
        documentId_userId: {
          documentId,
          userId,
        },
      },
    });

    if (!collaborator) {
      throw new NotFoundError('Collaborator not found on this document');
    }

    return prisma.collaborator.update({
      where: {
        documentId_userId: {
          documentId,
          userId,
        },
      },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  static async getCollaborators(documentId: string) {
    return prisma.collaborator.findMany({
      where: { documentId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }
}
