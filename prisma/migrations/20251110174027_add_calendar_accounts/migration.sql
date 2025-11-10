/*
  Warnings:

  - You are about to drop the column `provider` on the `calendars` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,calendarAccountId,externalId]` on the table `calendars` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `calendarAccountId` to the `calendars` table without a default value. This is not possible if the table is not empty.

*/

-- Step 1: Drop foreign key temporarily
ALTER TABLE "events" DROP CONSTRAINT "events_calendarId_fkey";

-- Step 2: Drop old indexes
DROP INDEX "calendars_provider_externalId_idx";
DROP INDEX "calendars_userId_provider_externalId_key";

-- Step 3: Create CalendarAccount table
CREATE TABLE "CalendarAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "encryptedPassword" TEXT,
    "calDavUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarAccount_pkey" PRIMARY KEY ("id")
);

-- Step 4: Add temporary column to calendars for migration
ALTER TABLE "calendars" ADD COLUMN "calendarAccountId" TEXT;

-- Step 5: Migrate existing data - Create CalendarAccounts for Google calendars
-- Copy OAuth data from Account table and email from User table
INSERT INTO "CalendarAccount" ("id", "userId", "email", "provider", "providerAccountId", "accessToken", "refreshToken", "expiresAt", "scope", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid(),
    a."userId",
    u."email",
    'google',
    a."accountId",
    a."accessToken",
    a."refreshToken",
    a."accessTokenExpiresAt",
    a."scope",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "account" a
INNER JOIN "user" u ON a."userId" = u."id"
WHERE a."providerId" = 'google'
ON CONFLICT DO NOTHING;

-- Step 6: Migrate existing data - Create CalendarAccounts for CampusClock (local) calendars
INSERT INTO "CalendarAccount" ("id", "userId", "provider", "providerAccountId", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid(),
    "userId",
    'campusclock',
    "userId" || '-campusclock-default',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "calendars"
WHERE "provider" IS NULL
GROUP BY "userId"
ON CONFLICT DO NOTHING;

-- Step 7: Update calendars to reference the CalendarAccounts
-- For Google calendars
UPDATE "calendars" c
SET "calendarAccountId" = ca."id"
FROM "CalendarAccount" ca
WHERE c."userId" = ca."userId"
  AND c."provider" = 'GOOGLE'
  AND ca."provider" = 'google';

-- For local calendars (null provider -> campusclock)
UPDATE "calendars" c
SET "calendarAccountId" = ca."id"
FROM "CalendarAccount" ca
WHERE c."userId" = ca."userId"
  AND c."provider" IS NULL
  AND ca."provider" = 'campusclock';

-- Step 8: Make calendarAccountId NOT NULL now that all rows have values
ALTER TABLE "calendars" ALTER COLUMN "calendarAccountId" SET NOT NULL;

-- Step 9: Drop the old provider column
ALTER TABLE "calendars" DROP COLUMN "provider";

-- Step 10: Drop the old enum
DROP TYPE "calendar_provider";

-- Step 11: Create indexes
CREATE INDEX "CalendarAccount_userId_idx" ON "CalendarAccount"("userId");
CREATE UNIQUE INDEX "CalendarAccount_userId_provider_providerAccountId_key" ON "CalendarAccount"("userId", "provider", "providerAccountId");
CREATE UNIQUE INDEX "calendars_userId_calendarAccountId_externalId_key" ON "calendars"("userId", "calendarAccountId", "externalId");

-- Step 12: Add foreign keys
ALTER TABLE "CalendarAccount" ADD CONSTRAINT "CalendarAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "calendars" ADD CONSTRAINT "calendars_calendarAccountId_fkey" FOREIGN KEY ("calendarAccountId") REFERENCES "CalendarAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "calendars"("id") ON DELETE CASCADE ON UPDATE CASCADE;
