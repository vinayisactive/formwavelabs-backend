-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('MOBILE', 'DESKTOP');

-- CreateTable
CREATE TABLE "FormVisit" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "deviceType" "DeviceType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormAnalyticsSummary" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "totalVisits" INTEGER NOT NULL DEFAULT 0,
    "mobileVisits" INTEGER NOT NULL DEFAULT 0,
    "desktopVisits" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FormAnalyticsSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FormVisit_formId_idx" ON "FormVisit"("formId");

-- CreateIndex
CREATE INDEX "FormVisit_createdAt_idx" ON "FormVisit"("createdAt");

-- CreateIndex
CREATE INDEX "FormVisit_formId_deviceType_idx" ON "FormVisit"("formId", "deviceType");

-- CreateIndex
CREATE UNIQUE INDEX "FormAnalyticsSummary_formId_key" ON "FormAnalyticsSummary"("formId");

-- CreateIndex
CREATE INDEX "Form_workspaceId_idx" ON "Form"("workspaceId");

-- CreateIndex
CREATE INDEX "Form_status_idx" ON "Form"("status");

-- CreateIndex
CREATE INDEX "Form_createdAt_idx" ON "Form"("createdAt");

-- CreateIndex
CREATE INDEX "FormPage_formId_idx" ON "FormPage"("formId");

-- CreateIndex
CREATE INDEX "FormPage_page_formId_idx" ON "FormPage"("page", "formId");

-- CreateIndex
CREATE INDEX "Submission_formId_idx" ON "Submission"("formId");

-- CreateIndex
CREATE INDEX "Submission_createdAt_idx" ON "Submission"("createdAt");

-- AddForeignKey
ALTER TABLE "FormVisit" ADD CONSTRAINT "FormVisit_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormAnalyticsSummary" ADD CONSTRAINT "FormAnalyticsSummary_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;
