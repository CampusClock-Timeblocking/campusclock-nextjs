import { onboardingRouter } from "@/server/api/routers/onboarding";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { calendarRouter } from "./routers/calendar";
import { taskRouter } from "./routers/tasks";
import { projectsRouter } from "./routers/projects";
import { habitRouter } from "./routers/habits";
import { schedulerRouter } from "./routers/scheduler";
import { calendarAccountRouter } from "./routers/calendar-account";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  onboarding: onboardingRouter,
  calendar: calendarRouter,
  task: taskRouter,
  project: projectsRouter,
  habit: habitRouter,
  scheduler: schedulerRouter,
  calendarAccount: calendarAccountRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
