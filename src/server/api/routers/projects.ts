import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { CreateProjectSchema, UpdateProjectSchema } from "@/lib/zod";

export const projectsRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    return ctx.db.project.findMany({
      where: {
        userId,
      },
      include: {
        parent: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }),

  create: protectedProcedure
    .input(CreateProjectSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      return ctx.db.project.create({
        data: {
          ...input,
          userId,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: UpdateProjectSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      return ctx.db.project.update({
        where: { id: input.id, userId },
        data: input.data,
      });
    }),

  updateMany: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.string().uuid()),
        data: UpdateProjectSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      return ctx.db.project.updateMany({
        where: { id: { in: input.ids }, userId },
        data: input.data,
      });
    }),

  delete: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      return ctx.db.project.delete({
        where: { id: input.id, userId },
      });
    }),

  bulkDelete: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.string().uuid()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      await ctx.db.project.deleteMany({
        where: {
          id: { in: input.ids },
          userId,
        },
      });

      return { success: true };
    }),
});
