import {
  type PrismaClient,
  type Task,
  type Event,
  CalendarType,
  Weekday,
} from "@prisma/client";

type SchedulerUserFixture = {
  userId: string;
  calendarId: string;
  readOnlyCalendarId: string;
};

type TaskOverrides = Partial<
  Pick<Task, "title" | "durationMinutes" | "priority" | "complexity" | "due">
> & {
  preferredStartAfter?: number | null;
};

type EventOverrides = Partial<Pick<Event, "title" | "description" | "color">> & {
  start: Date;
  end: Date;
  taskId?: string | null;
  calendarId?: string;
};

let fixtureCounter = 0;

function uniqueSuffix(): string {
  fixtureCounter += 1;
  return `${Date.now()}-${fixtureCounter}`;
}

export function utcDate(day: string, time = "00:00"): Date {
  return new Date(`${day}T${time}:00.000Z`);
}

function timeOnly(time: string): Date {
  return new Date(`1970-01-01T${time}:00.000Z`);
}

export async function createSchedulerUserFixture(
  db: PrismaClient,
  options?: {
    workingDays?: Weekday[];
    earliestTime?: string;
    latestTime?: string;
    horizonDays?: number;
  },
): Promise<SchedulerUserFixture> {
  const suffix = uniqueSuffix();
  const userId = `scheduler-e2e-user-${suffix}`;

  await db.user.create({
    data: {
      id: userId,
      name: "Scheduler E2E User",
      email: `scheduler-e2e-${suffix}@example.com`,
      emailVerified: true,
    },
  });

  const calendarAccount = await db.calendarAccount.create({
    data: {
      userId,
      provider: "campusclock",
      providerAccountId: `campusclock-${suffix}`,
      email: `scheduler-e2e-${suffix}@example.com`,
      name: "CampusClock Test Account",
    },
  });

  const writableCalendar = await db.calendar.create({
    data: {
      userId,
      calendarAccountId: calendarAccount.id,
      name: "Writable Scheduler Test Calendar",
      backgroundColor: "#3b82f6",
      foregroundColor: "#ffffff",
      type: CalendarType.LOCAL,
      readOnly: false,
    },
  });

  const readOnlyCalendar = await db.calendar.create({
    data: {
      userId,
      calendarAccountId: calendarAccount.id,
      name: "Read Only Scheduler Test Calendar",
      backgroundColor: "#9ca3af",
      foregroundColor: "#111827",
      type: CalendarType.LOCAL,
      readOnly: true,
    },
  });

  await db.schedulingConfig.create({
    data: {
      userId,
      timezone: "UTC",
      horizonDays: options?.horizonDays ?? 7,
      allowTaskSplitting: false,
      reschedulingAggressiveness: 0.5,
      reschedulingPolicy: "MANUAL_TRIGGER",
    },
  });

  await db.workingPreferences.create({
    data: {
      userId,
      earliestTime: timeOnly(options?.earliestTime ?? "09:00"),
      latestTime: timeOnly(options?.latestTime ?? "17:00"),
      workingDays:
        options?.workingDays ?? [
          Weekday.MONDAY,
          Weekday.TUESDAY,
          Weekday.WEDNESDAY,
          Weekday.THURSDAY,
          Weekday.FRIDAY,
        ],
      dailyMaxMinutes: 600,
      dailyOptimalMinutes: 480,
      focusPeriodMinutes: 60,
      shortBreakMinutes: 15,
      longBreakMinutes: 60,
      longBreakFrequency: 3,
      alertnessByHour: Array.from({ length: 24 }, (_, hour) =>
        hour >= 9 && hour < 17 ? 0.9 : 0.3,
      ),
    },
  });

  return {
    userId,
    calendarId: writableCalendar.id,
    readOnlyCalendarId: readOnlyCalendar.id,
  };
}

export async function createTaskFixture(
  db: PrismaClient,
  userId: string,
  overrides?: TaskOverrides,
) {
  return db.task.create({
    data: {
      userId,
      title: overrides?.title ?? "Scheduler Test Task",
      status: "TO_DO",
      durationMinutes: overrides?.durationMinutes ?? 60,
      priority: overrides?.priority ?? 10,
      complexity: overrides?.complexity ?? 5,
      due: overrides?.due ?? null,
      preferredStartAfter:
        overrides?.preferredStartAfter === undefined
          ? null
          : overrides.preferredStartAfter,
    },
  });
}

export async function createBusyEventFixture(
  db: PrismaClient,
  userId: string,
  overrides: EventOverrides,
) {
  const calendarId =
    overrides.calendarId ??
    (
      await db.calendar.findFirstOrThrow({
        where: {
          userId,
          readOnly: false,
        },
        select: {
          id: true,
        },
      })
    ).id;

  return db.event.create({
    data: {
      title: overrides.title ?? "Busy Event",
      description: overrides.description ?? null,
      start: overrides.start,
      end: overrides.end,
      allDay: false,
      color: overrides.color ?? "#ef4444",
      location: null,
      calendarId,
      taskId: overrides.taskId ?? null,
    },
  });
}
