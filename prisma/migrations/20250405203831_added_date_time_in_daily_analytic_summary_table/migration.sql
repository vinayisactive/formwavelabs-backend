/*
  Warnings:

  - You are about to drop the column `date` on the `DailyAnalyticsSummary` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[formId,createdAt]` on the table `DailyAnalyticsSummary` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "DailyAnalyticsSummary_formId_date_key";

-- AlterTable
ALTER TABLE "DailyAnalyticsSummary" DROP COLUMN "date",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "DailyAnalyticsSummary_formId_createdAt_key" ON "DailyAnalyticsSummary"("formId", "createdAt");
