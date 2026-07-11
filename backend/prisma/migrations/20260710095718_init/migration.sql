/*
  Warnings:

  - The values [OWNER] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `editedBy` on the `Version` table. All the data in the column will be lost.
  - Changed the type of `content` on the `Document` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `editedById` to the `Version` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `content` on the `Version` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('EDITOR', 'VIEWER');
ALTER TABLE "Collaborator" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
COMMIT;

-- AlterTable
ALTER TABLE "Collaborator" ALTER COLUMN "role" SET DEFAULT 'EDITOR';

-- AlterTable
ALTER TABLE "Document" ALTER COLUMN "title" SET DEFAULT 'Untitled',
DROP COLUMN "content",
ADD COLUMN     "content" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Version" DROP COLUMN "editedBy",
ADD COLUMN     "editedById" TEXT NOT NULL,
DROP COLUMN "content",
ADD COLUMN     "content" JSONB NOT NULL;

-- CreateIndex
CREATE INDEX "Collaborator_documentId_idx" ON "Collaborator"("documentId");

-- CreateIndex
CREATE INDEX "Collaborator_userId_idx" ON "Collaborator"("userId");

-- CreateIndex
CREATE INDEX "Document_ownerId_idx" ON "Document"("ownerId");

-- CreateIndex
CREATE INDEX "Version_documentId_idx" ON "Version"("documentId");

-- CreateIndex
CREATE INDEX "Version_editedById_idx" ON "Version"("editedById");

-- AddForeignKey
ALTER TABLE "Version" ADD CONSTRAINT "Version_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
