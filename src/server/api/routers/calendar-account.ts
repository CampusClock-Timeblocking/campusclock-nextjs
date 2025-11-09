import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { CalDAVService } from "../services/caldav.service";
import { syncCalendars } from "tsdav";
import { TRPCError } from "@trpc/server";
import { GCalService } from "../services/g-cal-service";

// Zod Schemas
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

// Router
export const calendarAccountRouter = createTRPCRouter({
  // Get all calendar accounts for the current user
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

  // Get a single calendar account by ID
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

  // Create a new calendar account
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

  // Update an existing calendar account
  update: protectedProcedure
    .input(updateCalendarAccountSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Verify ownership
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

  // Delete a calendar account
  delete: protectedProcedure
    .input(deleteCalendarAccountSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
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
      }
    }),
});
