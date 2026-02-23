/**
 * Explain Service
 * Generates human-readable German explanations for why each task was scheduled
 * at its specific time slot. Uses OpenAI gpt-4o-mini.
 *
 * Degrades gracefully: returns {} if OPENAI_API_KEY is not configured.
 */

import { getOpenAIClient } from "@/server/lib/openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { TaskDebugInfo } from "@/server/lib/scheduler/ea-core";
import type { ScheduledTask } from "@/server/lib/scheduler/types";

// ============================================================================
// Response Schema
// ============================================================================

// OpenAI structured output doesn't support z.record() — use an array instead.
const explanationEntrySchema = z.object({
  taskId: z.string(),
  explanation: z.string(),
});

const explanationResponseSchema = z.object({
  explanations: z.array(explanationEntrySchema),
});

// ============================================================================
// Service Function
// ============================================================================

/**
 * Generate one German sentence per scheduled task explaining *why* it was placed
 * at its specific time. Called lazily (opt-in) after the schedule preview loads.
 *
 * @param scheduledTasks  Tasks with ISO start/end times from ScheduleResponse
 * @param tasks           Original task objects (for title, complexity, etc.)
 * @param debugInfo       Per-task debug info from computeTaskDebugInfo()
 * @returns               Record<taskId, German sentence>
 */
export async function explainScheduledTasks(
  scheduledTasks: ScheduledTask[],
  tasks: Array<{
    id: string;
    title: string;
    complexity?: number;
    deadline?: string | null;
    location?: string;
  }>,
  debugInfo: Record<string, TaskDebugInfo>,
): Promise<Record<string, string>> {
  const client = getOpenAIClient();
  if (!client) return {};

  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  const context = scheduledTasks.map((st) => {
    const task = taskMap.get(st.id);
    const debug = debugInfo[st.id];
    const startDate = new Date(st.start);

    return {
      taskId: st.id,
      taskName: task?.title ?? "Unbekannt",
      scheduledAt: startDate.toLocaleString("de-DE", {
        weekday: "long",
        hour: "2-digit",
        minute: "2-digit",
      }),
      energyAtSlot: debug?.energyAtSlot ?? 0.5,
      deadlineDistanceHours:
        debug?.deadlineDistanceMinutes !== undefined &&
        debug.deadlineDistanceMinutes !== Infinity
          ? Math.round(debug.deadlineDistanceMinutes / 60)
          : null,
      isInLocationCluster: debug?.isInLocationCluster ?? false,
      bonuses: debug?.bonusesApplied ?? [],
      penalties: debug?.penaltiesApplied ?? [],
    };
  });

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-5-mini-2025-08-07",
      messages: [
        {
          role: "system",
          content: `Du bist ein Planungs-Assistent für CampusClock, eine Zeitblock-App für Studierende.
Für jede geplante Aufgabe schreibe GENAU EINEN kurzen deutschen Satz (max. 20 Wörter), der erklärt, warum sie zu diesem Zeitpunkt eingeplant wurde.
Konzentriere dich auf den stärksten Grund: Deadline-Nähe (wenn < 24 Stunden), Energieniveau oder Standortcluster.

Beispiel: "Mathe wurde auf 09:00 geplant, da du dann höchste Energie hast und die Deadline morgen ist."

Du bekommst ein Array von Aufgaben-Kontextobjekten. Gib ein JSON-Objekt zurück mit einem Array "explanations", das Objekte mit "taskId" und "explanation" enthält.`,
        },
        {
          role: "user",
          content: JSON.stringify(context),
        },
      ],
      max_completion_tokens: 2048,
      response_format: zodResponseFormat(
        explanationResponseSchema,
        "schedule_explanations",
      ),
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) return {};

    const parsed = explanationResponseSchema.parse(JSON.parse(responseContent));
    return Object.fromEntries(
      parsed.explanations.map((e) => [e.taskId, e.explanation]),
    );
  } catch (error) {
    console.error("[explain-service] Failed to generate explanations:", error);
    return {};
  }
}
