-- CreateEnum
CREATE TYPE "Theme" AS ENUM ('BOXY', 'ROUNDED');

-- AlterTable
ALTER TABLE "Form" ADD COLUMN     "theme" "Theme" NOT NULL DEFAULT 'ROUNDED';
