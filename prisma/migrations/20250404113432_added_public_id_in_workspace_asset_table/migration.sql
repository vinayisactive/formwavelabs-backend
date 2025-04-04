/*
  Warnings:

  - Added the required column `imagePublicId` to the `WorkspaceAssets` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "WorkspaceAssets" ADD COLUMN     "imagePublicId" TEXT NOT NULL;
