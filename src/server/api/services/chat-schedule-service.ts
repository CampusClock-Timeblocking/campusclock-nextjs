/**
 * Chat Schedule Service
 * Parses natural language feedback from the user about their schedule
 * and returns a structured intent describing which task field to change.
 *
 * Degrades gracefully: returns null if OPENAI_API_KEY is not configured.
 */

import { getOpenAIClient } from "@/server/lib/openai";
import { zodResponseFormat } from "openai/helpers/zod";
import {
  scheduleEditIntentSchema,
  type ScheduleEditIntent,
} from "@/lib/zod";
import type { ScheduledTask } from "@/server/lib/scheduler/types";

// ============================================================================
// System Prompt
// ============================================================================

function buildSystemPrompt(todayIso: string): string {
  return `Du bist ein Planungs-Assistent für CampusClock, eine Zeitblock-App für Studierende.
Der Nutzer spricht Deutsch. Du erhältst sein natürlichsprachiges Feedback zu seinem aktuellen Stundenplan.
Heutiges Datum: ${todayIso}

Deine Aufgabe: Extrahiere EINE Absicht zur Änderung EINER Aufgabeneigenschaft. Sei konservativ.
Gib JSON zurück, das dem ScheduleEditIntent-Schema entspricht:
{
  "taskId": "<UUID der betroffenen Aufgabe, oder leerer String wenn unklar>",
  "field": "deadline" | "priority" | "durationMinutes" | "location" | "preferredStartAfter",
  "operation": "set" | "shift_earlier" | "shift_later" | "increase" | "decrease",
  "value": <optional: ISO-Datetime-String für deadline; Integer Minuten (0–1439) für preferredStartAfter; Zahl für priority (0.0–1.0) oder durationMinutes>,
  "explanation": "<Ein deutscher Satz: was du verstanden hast und ändern wirst, oder eine Rückfrage>"
}

Zuordnungsregeln:
- "früher" / "früher anfangen" → field=deadline, operation=shift_earlier (2 Stunden früher)
- "Nachmittag" / "nachmittags" / "am Nachmittag" → field=preferredStartAfter, operation=set, value=780 (13:00 = 13×60)
- "Morgens" / "früh" → field=preferredStartAfter, operation=set, value=360 (06:00 = 6×60)
- "Abends" → field=preferredStartAfter, operation=set, value=1020 (17:00 = 17×60)
- "länger" / "mehr Zeit" → field=durationMinutes, operation=increase (30 Minuten mehr)
- "kürzer" → field=durationMinutes, operation=decrease (15 Minuten weniger)
- "wichtiger" / "dringend" → field=priority, operation=increase
- Wenn Aufgabe unklar oder nicht erkennbar: taskId="" und explanation als Rückfrage auf Deutsch
- NIEMALS mehr als eine Aufgabe pro Antwort ändern`;
}

// ============================================================================
// Service Function
// ============================================================================

/**
 * Parse natural language feedback from the user and return a structured intent.
 *
 * @param userMessage          The user's feedback text
 * @param scheduledTasks       Current schedule (start/end times per task)
 * @param tasks                Task objects with title and current properties
 * @param todayIso             Today's date as ISO string (YYYY-MM-DD)
 * @returns                    Parsed intent, or null if AI is unavailable / parsing failed
 */
export async function parseScheduleFeedback(
  userMessage: string,
  scheduledTasks: ScheduledTask[],
  tasks: Array<{
    id: string;
    title: string;
    due?: Date | null;
    priority: number | null;
    durationMinutes: number | null;
    preferredStartAfter: number | null;
  }>,
  todayIso: string,
): Promise<ScheduleEditIntent | null> {
  const client = getOpenAIClient();
  if (!client) return null;

  const scheduledMap = new Map(scheduledTasks.map((s) => [s.id, s]));

  const taskContext = tasks.map((t) => {
    const scheduled = scheduledMap.get(t.id);
    return {
      id: t.id,
      title: t.title,
      scheduledAt: scheduled?.start ?? null,
      deadline: t.due?.toISOString() ?? null,
      priority: t.priority,
      durationMinutes: t.durationMinutes,
      preferredStartAfter: t.preferredStartAfter,
    };
  });

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(todayIso),
        },
        {
          role: "user",
          content: `Aktueller Stundenplan:\n${JSON.stringify(taskContext, null, 2)}\n\nNutzerfeedback: "${userMessage}"`,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: zodResponseFormat(
        scheduleEditIntentSchema,
        "schedule_edit_intent",
      ),
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) return null;

    return scheduleEditIntentSchema.parse(JSON.parse(responseContent));
  } catch (error) {
    console.error("[chat-schedule-service] Failed to parse feedback:", error);
    return null;
  }
}
