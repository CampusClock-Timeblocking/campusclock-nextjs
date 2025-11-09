import { Google } from "arctic";

export const google = new Google(
  process.env.GOOGLE_CALENDAR_CLIENT_ID!,
  process.env.GOOGLE_CALENDAR_CLIENT_SECRET!,
  `${process.env.BETTER_AUTH_URL}/api/calendar/google/callback`,
);
