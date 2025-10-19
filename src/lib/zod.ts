import { z } from "zod";

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

/* Common Schemas */

const titleSchema = z.string().min(1, "Title is required").max(200);
const descriptionSchema = z.string().max(2000).optional();
const prioritySchema = z.int().min(1).max(10);

const weekDaySchema = z.int().min(0).max(6);
const weekdaysSchema = weekDaySchema
  .array()
  .max(7)
  .default([0, 1, 2, 3, 4, 5, 6])
  .refine(
    (weekdays) => new Set(weekdays).size === weekdays.length,
    "Weekdays must be unique",
  );

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
    startDate: z.coerce.date().optional(),
    deadline: z.coerce.date().optional(),
    status: ProjectStatusSchema.optional(),
    parentId: z.uuid().optional(),
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

export const CreateTaskSchema = z.object({
  title: titleSchema,
  description: descriptionSchema.optional(),
  status: TaskStatusSchema.optional(),
  durationMinutes: z.int().min(1).optional(),
  priority: prioritySchema.optional(),
  complexity: z.int().min(1).max(10).optional(),
  due: z.coerce.date().optional(),
  scheduledTime: z.iso.time().optional(),
  projectId: z.uuid().optional(),
  habitId: z.uuid().optional(),
});

export const UpdateTaskSchema = CreateTaskSchema.partial();

/* Habit Schemas */

export const CreateHabitSchema = z.object({
  title: titleSchema,
  description: descriptionSchema.optional(),
  durationMinutes: z.int().min(1).optional(),
  priority: prioritySchema.optional(),
  active: z.boolean().optional(),
  recurrenceType: PeriodUnitSchema,
  interval: z.int().min(1).max(365).optional(),
  timesPerPeriod: z.int().min(1).max(100).optional(),
  byWeekdays: weekdaysSchema.optional(),
  preferredTime: z.iso.time().optional(),
  customRule: z.record(z.string(), z.any()).optional(),
});

export const UpdateHabitSchema = CreateHabitSchema.partial();

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

export const CreateWorkingPreferencesSchema = z
  .object({
    // Hours + availability
    earliestTime: z.iso.time(),
    latestTime: z.iso.time(),
    dailyMaxMinutes: z.int().min(60).max(1440).default(600), // 1 hour to 24 hours
    dailyOptimalMinutes: z.int().min(30).max(1440).default(480), // 30 min to 24 hours
    workingDays: weekdaysSchema.default([0, 1, 2, 3, 4, 5, 6]),

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

export const CreateEventFormSchema = CreateEventSchema
  .omit({ start: true, end: true, taskId: true })
  .extend({
    start: z.date(),
    end: z.date(),
  })
  .refine((data) => data.end >= data.start, {
    message: "End date must be after start date",
    path: ["end"],
  });

/* Type Exports */
export type CreateEventInput = z.infer<typeof CreateEventSchema>;
export type UpdateEventInput = z.infer<typeof UpdateEventSchema>;
export type CreateEventFormInput = z.infer<typeof CreateEventFormSchema>;
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
export type CreateHabitInput = z.infer<typeof CreateHabitSchema>;
export type UpdateHabitInput = z.infer<typeof UpdateHabitSchema>;
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
