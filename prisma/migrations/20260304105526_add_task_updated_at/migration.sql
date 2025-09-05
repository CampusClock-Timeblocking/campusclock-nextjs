-- AlterTable: add updatedAt with default for existing rows
ALTER TABLE "tasks" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW();
