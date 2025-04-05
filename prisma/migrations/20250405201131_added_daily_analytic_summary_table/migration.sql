-- CreateTable
CREATE TABLE "DailyAnalyticsSummary" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "totalVisit" INTEGER NOT NULL DEFAULT 0,
    "totalSubmissions" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DailyAnalyticsSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyAnalyticsSummary_formId_date_key" ON "DailyAnalyticsSummary"("formId", "date");

-- AddForeignKey
ALTER TABLE "DailyAnalyticsSummary" ADD CONSTRAINT "DailyAnalyticsSummary_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;
