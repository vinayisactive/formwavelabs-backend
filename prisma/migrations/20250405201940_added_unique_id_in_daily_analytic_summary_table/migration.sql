/*
  Warnings:

  - A unique constraint covering the columns `[formId]` on the table `DailyAnalyticsSummary` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "DailyAnalyticsSummary_formId_key" ON "DailyAnalyticsSummary"("formId");
