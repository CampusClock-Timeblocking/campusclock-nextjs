import { type PrismaClient, type Event, type Calendar } from "@prisma/client";
import { db as newDbInstance } from "@/server/db";
import { GCalService } from "./g-cal-service";
import { CacheService } from "./cache-service";
import type { CreateCalendarAccount } from "../routers/calendar-account";

export interface CalendarWithEvents extends Calendar {
  events: Omit<Event, "calendar" | "task">[];
}

export class CalendarAccountService {
  private readonly db: PrismaClient;
  private readonly gCalService: GCalService;
  private readonly cache: CacheService;

  constructor(db?: PrismaClient) {
    this.db = db ?? newDbInstance;
    this.gCalService = new GCalService(this.db);
    this.cache = new CacheService(120); // 2 minutes TTL
  }

  async initCampusClockCalendarAccount(userId: string, userEmail?: string) {
    const calendarAccount = await this.db.calendarAccount.create({
      data: {
        userId,
        provider: "campusclock",
        email: userEmail,
        name: "CampusClock",
        providerAccountId: `campusClock-${userId}`,
        calendars: {
          create: {
            userId,
            name: "CampusClock",
            type: "LOCAL",
            backgroundColor: "#9a9cff",
            foregroundColor: "#000000",
            readOnly: false,
          },
        },
      },
    });

    return calendarAccount;
  }

  async linkCalendarAccount(account: CreateCalendarAccount, userId: string) {
    const calendarAccount = await this.db.calendarAccount.upsert({
      where: {
        userId_provider_providerAccountId: {
          userId,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
        },
      },
      update: {
        accessToken: account.accessToken,
        refreshToken: account.refreshToken,
        expiresAt: account.expiresAt,
        email: account.email,
        name: account.name,
      },
      create: {
        userId,
        ...account,
      },
    });

    return calendarAccount;
  }
}
