import { env } from "@/env";
import { Google } from "arctic";

export const google = new Google(
  env.GOOGLE_CALENDAR_CLIENT_ID,
  env.GOOGLE_CALENDAR_CLIENT_SECRET,
  `${env.BETTER_AUTH_URL}/api/calendar/google/callback`,
);
