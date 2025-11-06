import { z } from "zod";
import { parseDuration } from "./utils";

/* Enums */

// REVIEW: Could be modeled as TypeScript enums
export const TaskStatusSchema = z.enum([
  "TO_DO",
  "SNOOZED",
  "SKIPPED",
  "IN_PROGRESS",
  "PAUSED",
  "COMPLETED",
  "CANCELLED",
]);

export const ProjectStatusSchema = z.enum([
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
]);

export const ReschedulingPolicySchema = z.enum([
  "EVENT_BASED",
  "DAILY_INTERVAL",
  "MANUAL_TRIGGER",
]);

export const PeriodUnitSchema = z.enum(["DAY", "WEEK", "MONTH", "YEAR"]);

export const weekdays = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;

export const energyProfiles = ["EARLY_BIRD", "BALANCED", "NIGHT_OWL"] as const;

/* Common Schemas */

const titleSchema = z
  .string()
  .min(1, "Title is required")
  .max(80, "Title must be at most 80 characters");

export const weekdaySchema = z.enum(weekdays);
const weekdaysSchema = weekdaySchema
  .array()
  .min(1, { message: "Select at least one day" })
  .max(7);
export type Weekday = z.infer<typeof weekdaySchema>;

// Weekdays for habits (0-6, where 0 is Sunday)
const habitWeekdaysSchema = z.array(z.number().int().min(0).max(6)).optional();
const descriptionSchema = z.string().max(2000).optional();
const prioritySchema = z.int().min(1).max(10);

/* User Schemas */

export const CreateUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.email("Invalid email format"),
  image: z.url("Invalid image URL").optional(),
});

export const UpdateUserSchema = CreateUserSchema.partial();

/* Project Schemas */

export const CreateProjectSchema = z
  .object({
    title: titleSchema,
    description: descriptionSchema.optional(),
    priority: prioritySchema.optional(),
    startDate: z.date().optional(),
    deadline: z.date().optional(),
    status: ProjectStatusSchema.optional(),
    parentId: z.uuid().optional().nullable(),
  })
  .refine(
    (data) =>
      !data.deadline || !data.startDate || data.deadline >= data.startDate,
    {
      message: "Deadline must be after start date",
      path: ["deadline"],
    },
  );

export const UpdateProjectSchema = CreateProjectSchema.partial();

/* Task Schemas */

export const durationSchema = z
  .string()
  .trim()
  .min(1, "Duration is required")
  .regex(
    /^(\d+m|\d+h|\d+h\s*\d+m|\d+:([0-9]|[1-5][0-9])h)$/,
    "Invalid duration format. Expected: 30m; 1h35m; 1h 35m; 1:45h; 3h",
  )
  .refine(
    (value) => {
      const parsed = parseDuration(value);
      return parsed !== null && parsed <= 1440;
    },
    {
      message: "Duration cannot exceed 24 hours",
    },
  );

export const optionalDurationSchema = z.union([
  durationSchema.optional(),
  z.literal("").transform(() => undefined),
]);

export const parseDurationSchema = durationSchema.transform((input, ctx) => {
  const parsed = parseDuration(input);
  if (parsed === null) {
    ctx.addIssue({
      code: "custom",
      message: "Failed to parse duration",
      path: ["durationMinutes"],
    });
    return z.NEVER;
  }
  return parsed;
});

export const rawCreateTaskSchema = z.object({
  title: titleSchema,
  description: descriptionSchema.optional(),
  status: TaskStatusSchema.optional(),
  durationMinutes: optionalDurationSchema,
  priority: prioritySchema.optional(),
  complexity: z.int().min(1).max(10).optional(),
  due: z.date().optional().nullable(),
  scheduledTime: z.iso.time().optional(),
  projectId: z.uuid().optional().nullable(),
  habitId: z.uuid().optional(),
});

export const rawUpdateTaskSchema = rawCreateTaskSchema.partial();

export const createTaskInputSchema = z.object({
  ...rawCreateTaskSchema.omit({ durationMinutes: true }).shape,
  durationMinutes: parseDurationSchema.optional(),
});

export const UpdateTaskInputSchema = createTaskInputSchema.partial();

/* Habit Schemas */

export const rawCreateHabitSchema = z.object({
  title: titleSchema,
  description: descriptionSchema.optional(),
  durationMinutes: durationSchema,
  priority: prioritySchema.optional(),
  active: z.boolean().optional(),
  recurrenceType: PeriodUnitSchema,
  interval: z.int().min(1).max(365).optional(),
  timesPerPeriod: z.int().min(1).max(100).optional(),
  byWeekdays: habitWeekdaysSchema,
  preferredTime: z.iso.time().optional(),
  customRule: z.record(z.string(), z.any()).optional(),
});

export const rawUpdateHabitSchema = rawCreateHabitSchema.partial();

export const createHabitInputSchema = z.object({
  ...rawCreateHabitSchema.omit({ durationMinutes: true }).shape,
  durationMinutes: parseDurationSchema,
});

export const updateHabitInputSchema = createHabitInputSchema.partial();

/* Schedule Block Schemas */

export const CreateScheduleBlockSchema = z
  .object({
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    taskId: z.uuid(),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });

export const UpdateScheduleBlockSchema = CreateScheduleBlockSchema.partial();

/* Task Completion Schemas */

export const CreateTaskCompletionSchema = z
  .object({
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    taskId: z.uuid(),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });

export const UpdateTaskCompletionSchema = CreateTaskCompletionSchema.partial();

/* Scheduling Config Schemas */

export const CreateSchedulingConfigSchema = z.object({
  timezone: z.string().min(1).max(50).optional(),
  horizonDays: z.int().min(1).max(30).optional(),
  allowTaskSplitting: z.boolean().optional(),
  reschedulingAggressiveness: prioritySchema.optional(),
  reschedulingPolicy: ReschedulingPolicySchema.optional(),
});

export const UpdateSchedulingConfigSchema =
  CreateSchedulingConfigSchema.partial();

/* Working Preferences Schemas */

export const WorkingHoursSchema = z.object({
  // Hours + availability
  earliestTime: z.iso.time(),
  latestTime: z.iso.time(),
  workingDays: weekdaysSchema,
});
export type WorkingHours = z.infer<typeof WorkingHoursSchema>;

export const PreferencesInput = z.object({
  energyProfile: z.enum(energyProfiles),
});
export type Preferences = z.infer<typeof PreferencesInput>;

export const CreateWorkingPreferencesSchema = WorkingHoursSchema.extend({
  // Hours + availability
  dailyMaxMinutes: z.int().min(60).max(1440).default(600), // 1 hour to 24 hours
  dailyOptimalMinutes: z.int().min(30).max(1440).default(480), // 30 min to 24 hours

  // Rhythm + breaks
  focusPeriodMinutes: z.int().min(15).max(480).default(60), // 15 min to 8 hours
  shortBreakMinutes: z.int().min(5).max(120).default(15), // 5 min to 2 hours
  longBreakMinutes: z.int().min(15).max(480).default(60), // 15 min to 8 hours
  longBreakFrequency: z.int().min(1).max(20).default(3), // 1 to 20 sessions

  // Energy profile
  alertnessByHour: z.array(z.number().min(0).max(1)).length(24),
})
  .refine(
    (data) => {
      const earliest = data.earliestTime;
      const latest = data.latestTime;
      if (!earliest || !latest) return true;

      const [earliestHour, earliestMin] = earliest.split(":").map(Number);
      const [latestHour, latestMin] = latest.split(":").map(Number);
      const earliestMinutes = (earliestHour ?? 0) * 60 + (earliestMin ?? 0);
      const latestMinutes = (latestHour ?? 0) * 60 + (latestMin ?? 0);

      return latestMinutes > earliestMinutes;
    },
    {
      message: "Latest time must be after earliest time",
      path: ["latestTime"],
    },
  )
  .refine(
    (data) =>
      !data.dailyOptimalMinutes ||
      !data.dailyMaxMinutes ||
      data.dailyOptimalMinutes <= data.dailyMaxMinutes,
    {
      message:
        "Daily optimal minutes must be less than or equal to daily max minutes",
      path: ["dailyOptimalMinutes"],
    },
  );

export const UpdateWorkingPreferencesSchema =
  CreateWorkingPreferencesSchema.partial();

/* Excluded Period Schemas */

export const CreateExcludedPeriodSchema = z
  .object({
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    reason: descriptionSchema.optional(),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });

export const UpdateExcludedPeriodSchema = CreateExcludedPeriodSchema.partial();

export const CreateEventSchema = z
  .object({
    title: titleSchema,
    description: descriptionSchema.optional(),
    start: z.coerce.date(),
    end: z.coerce.date(),
    allDay: z.boolean().optional(),
    color: z.string().optional(),
    location: z.string().optional(),
    calendarId: z.string().min(1, "Calendar is required"),
    taskId: z.uuid().optional(),
  })
  .refine((data) => data.end >= data.start, {
    message: "End date must be after start date",
    path: ["end"],
  });

export const UpdateEventSchema = CreateEventSchema.partial().extend({
  id: z.uuid(),
});

export const CreateEventFormSchema = CreateEventSchema.omit({
  start: true,
  end: true,
  taskId: true,
})
  .extend({
    start: z.date(),
    end: z.date(),
  })
  .refine((data) => data.end >= data.start, {
    message: "End date must be after start date",
    path: ["end"],
  });

export const aiTaskInferenceResultSchema = z.object({
  durationMinutes: z.number().int().min(1).max(1440),
  priority: z.number().int().min(1).max(5),
  complexity: z.number().int().min(1).max(10),
});

/* Type Exports */
export type CreateEventInput = z.infer<typeof CreateEventSchema>;
export type UpdateEventInput = z.infer<typeof UpdateEventSchema>;
export type CreateEventFormInput = z.infer<typeof CreateEventFormSchema>;
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;
export type FrontendCreateTaskInput = z.infer<typeof rawCreateTaskSchema>;
export type FrontendUpdateTaskInput = z.infer<typeof rawUpdateTaskSchema>;
export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskInputSchema>;
export type FrontendCreateHabitInput = z.infer<typeof rawCreateHabitSchema>;
export type FrontendUpdateHabitInput = z.infer<typeof rawCreateHabitSchema>;
export type CreateHabitInput = z.infer<typeof rawCreateHabitSchema>;
export type UpdateHabitInput = z.infer<typeof updateHabitInputSchema>;
export type CreateScheduleBlockInput = z.infer<
  typeof CreateScheduleBlockSchema
>;
export type UpdateScheduleBlockInput = z.infer<
  typeof UpdateScheduleBlockSchema
>;
export type CreateTaskCompletionInput = z.infer<
  typeof CreateTaskCompletionSchema
>;
export type UpdateTaskCompletionInput = z.infer<
  typeof UpdateTaskCompletionSchema
>;
export type CreateSchedulingConfigInput = z.infer<
  typeof CreateSchedulingConfigSchema
>;
export type UpdateSchedulingConfigInput = z.infer<
  typeof UpdateSchedulingConfigSchema
>;
export type CreateWorkingPreferencesInput = z.infer<
  typeof CreateWorkingPreferencesSchema
>;
export type UpdateWorkingPreferencesInput = z.infer<
  typeof UpdateWorkingPreferencesSchema
>;
export type CreateExcludedPeriodInput = z.infer<
  typeof CreateExcludedPeriodSchema
>;
export type UpdateExcludedPeriodInput = z.infer<
  typeof UpdateExcludedPeriodSchema
>;
