import { env } from "@/env";
import type { PrismaClient } from "@prisma/client";
import { google } from "googleapis";
import { TRPCError } from "@trpc/server";

export class GCalService {
  private readonly db: PrismaClient;

  constructor(db: PrismaClient) {
    this.db = db;
  }

  private createOAuthClient() {
    return new google.auth.OAuth2(
      env.GOOGLE_CLIENT_ID as string,
      env.GOOGLE_CLIENT_SECRET as string,
    );
  }

  async getEvents(userId: string, start: Date, end: Date) {
    // Get the user's Google account access token
    const googleAccount = await this.db.account.findFirst({
      where: { userId, providerId: "google" },
    });

    if (!googleAccount?.accessToken) {
      throw new TRPCError({
        message: "No access token found",
        code: "NOT_FOUND",
      });
    }

    // Create OAuth client and set credentials
    const oAuthClient = this.createOAuthClient();
    oAuthClient.setCredentials({ access_token: googleAccount.accessToken });

    // Fetch events from Google Calendar
    const events = await google.calendar("v3").events.list({
      calendarId: "primary",
      eventTypes: ["default"],
      singleEvents: true,
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      maxResults: 2500,
      auth: oAuthClient,
    });

    // Transform events to our expected format
    return events.data.items?.map((event) => ({
      id: event.id,
      title: event.summary,
      start: event.start?.dateTime ?? event.start?.date,
      end: event.end?.dateTime ?? event.end?.date,
      allDay:
        event.start &&
        event.start.dateTime === undefined &&
        event.end?.dateTime === undefined,
    }));
  }
}
