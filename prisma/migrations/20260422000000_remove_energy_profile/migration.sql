-- Remove energy profile (alertnessByHour) and weightEnergyPenalty from WorkingPreferences
ALTER TABLE "WorkingPreferences" DROP COLUMN IF EXISTS "alertnessByHour";
ALTER TABLE "WorkingPreferences" DROP COLUMN IF EXISTS "weightEnergyPenalty";
