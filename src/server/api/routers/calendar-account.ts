import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { CalDAVService } from "../services/caldav.service";
import { TRPCError } from "@trpc/server";
import { GCalService } from "../services/g-cal-service";
import { encrypt, decrypt } from "@/server/lib/encryption";

export const createCalendarAccountSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().optional(),
  provider: z.string(),
  providerAccountId: z.string(),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  expiresAt: z.date().optional(),
  scope: z.string().optional(),
  encryptedPassword: z.string().optional(),
  calDavUrl: z.string().url().optional(),
});

export type CreateCalendarAccount = z.infer<typeof createCalendarAccountSchema>;

const updateCalendarAccountSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().optional(),
  name: z.string().optional(),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  expiresAt: z.date().optional(),
  scope: z.string().optional(),
  encryptedPassword: z.string().optional(),
  calDavUrl: z.string().url().optional(),
});

const deleteCalendarAccountSchema = z.object({
  id: z.string().uuid(),
});

const getByIdSchema = z.object({
  id: z.string().uuid(),
});

export const calendarAccountRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.calendarAccount.findMany({
      where: { userId: ctx.session.user.id },
      include: {
        calendars: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  }),

  getById: protectedProcedure
    .input(getByIdSchema)
    .query(async ({ ctx, input }) => {
      const account = await ctx.db.calendarAccount.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
        include: {
          calendars: true,
        },
      });

      if (!account) {
        throw new Error("Calendar account not found");
      }

      return account;
    }),

  create: protectedProcedure
    .input(createCalendarAccountSchema)
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.calendarAccount.create({
        data: {
          ...input,
          userId: ctx.session.user.id,
        },
        include: {
          calendars: true,
        },
      });
    }),

  update: protectedProcedure
    .input(updateCalendarAccountSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const account = await ctx.db.calendarAccount.findFirst({
        where: {
          id,
          userId: ctx.session.user.id,
        },
      });

      if (!account) {
        throw new Error("Calendar account not found");
      }

      return await ctx.db.calendarAccount.update({
        where: { id },
        data,
        include: {
          calendars: true,
        },
      });
    }),

  delete: protectedProcedure
    .input(deleteCalendarAccountSchema)
    .mutation(async ({ ctx, input }) => {
      const account = await ctx.db.calendarAccount.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
      });

      if (!account) {
        throw new Error("Calendar account not found");
      }

      return await ctx.db.calendarAccount.delete({
        where: { id: input.id },
      });
    }),

  syncCalendars: protectedProcedure
    .input(getByIdSchema)
    .mutation(async ({ ctx, input }) => {
      const account = await ctx.db.calendarAccount.findUnique({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
      });
      if (!account) {
        throw new TRPCError({
          message: "Calendar account not found",
          code: "NOT_FOUND",
        });
      }

      if (account.provider === "google") {
        const gCalService = new GCalService(ctx.db);
        return await gCalService.syncGoogleCalendarAccount(
          ctx.session.user.id,
          account.id,
        );
      } else if (account.provider === "iCloud") {
        if (
          !account.email ||
          !account.encryptedPassword ||
          !account.calDavUrl
        ) {
          throw new TRPCError({
            message: "Missing CalDAV credentials for iCloud account",
            code: "BAD_REQUEST",
          });
        }
        const decryptedPassword = decrypt(account.encryptedPassword);
        const caldavService = new CalDAVService(
          account.calDavUrl,
          account.email,
          decryptedPassword,
          ctx.db,
        );
        return await caldavService.syncCalDAVCalendarAccount(
          ctx.session.user.id,
          account.id,
        );
      }
    }),

  addICloudAccount: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
        appPassword: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const caldavService = new CalDAVService(
        "https://caldav.icloud.com",
        input.email,
        input.appPassword,
        ctx.db,
      );

      try {
        await caldavService.connect();
      } catch (error) {
        throw new TRPCError({
          message:
            "Failed to connect to iCloud. Please check your credentials.",
          code: "UNAUTHORIZED",
        });
      }

      const data = {
        userId: ctx.session.user.id,
        email: input.email,
        name: `iCloud (${input.email})`,
        provider: "iCloud",
        providerAccountId: input.email,
        encryptedPassword: encrypt(input.appPassword),
        calDavUrl: "https://caldav.icloud.com",
      };

      const calendarAccount = await ctx.db.calendarAccount.upsert({
        where: {
          userId_provider_providerAccountId: {
            userId: ctx.session.user.id,
            provider: "iCloud",
            providerAccountId: input.email,
          },
        },
        update: data,
        create: data,
      });

      await caldavService.syncCalDAVCalendarAccount(
        ctx.session.user.id,
        calendarAccount.id,
      );

      return calendarAccount;
    }),
});
