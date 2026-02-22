# AI Features — Explainable Scheduling & Feedback Loop

## Overview

Two AI features built on top of the EA scheduler:

1. **Explainable AI** — after generating a preview, each task shows a ℹ icon with a German sentence explaining *why* it was scheduled at that time.
2. **AI Feedback Loop** — inside the preview dialog, type natural language feedback ("Physik lieber nachmittags") to adjust the schedule iteratively before saving.

Both features require `OPENAI_API_KEY` in your `.env`. They degrade gracefully when the key is absent — the schedule still works normally, feedback input and explanation icons are simply hidden or return empty.

---

## Setup

### 1. Add your OpenAI key to `.env`

```env
OPENAI_API_KEY=sk-...
```

### 2. Apply the Prisma migration

The feedback loop stores `preferredStartAfter` (a time-of-day preference in minutes since midnight) on the `Task` model.

**With a live database:**

```bash
npx prisma migrate deploy
```

Or, if you're developing locally and want to create a new migration interactively:

```bash
npx prisma migrate dev
```

**The migration adds one column:**

```sql
ALTER TABLE "tasks" ADD COLUMN "preferredStartAfter" INTEGER;
```

After migrating, regenerate the Prisma client:

```bash
npx prisma generate
```

---

## How to use

### Explainable AI (ℹ icons)

1. Click **Vorschau** (Preview Schedule) in the header.
2. The schedule preview appears. After ~1–2 seconds, a ℹ icon appears next to each task.
3. Hover over the icon to read the German explanation, e.g.:
   > "Mathe wurde auf 09:00 geplant, da du dann höchste Energie hast und die Deadline morgen ist."

Explanations are fetched once per preview session and cached until the schedule changes.

### AI Feedback Loop

1. After the preview loads, type in the **"Passt das so?"** text box at the bottom of the dialog.
2. Press **Enter** (or the send button).
3. The AI interprets your message, updates the relevant task property in the database, and re-runs the EA.
4. A new schedule preview replaces the old one. The AI's reply appears in the feedback thread above the input.
5. Repeat until satisfied, then click **Ja, speichern** to commit to your calendar.

**Example phrases the AI understands:**

| German input | What changes |
|---|---|
| "Physik lieber nachmittags" | Sets `preferredStartAfter = 780` (13:00) on Physik |
| "Ich muss früher anfangen mit Mathe" | Shifts Mathe's deadline 2 hours earlier |
| "Mehr Zeit für Englisch" | Increases Englisch duration by 30 min |
| "Physik ist dringend" | Increases Physik priority |
| "Physik kürzer halten" | Decreases Physik duration by 15 min |

If the AI can't identify the task, it asks a clarifying question — type your answer to continue.

---

## How `preferredStartAfter` works in the EA

When a task has `preferredStartAfter = 780` (13:00), the evolutionary algorithm adds a **soft penalty of +400** if that task is scheduled before 13:00 on any given day. The EA will strongly prefer afternoon slots but can override the preference if no afternoon slot is available within the time horizon.

This value persists in the database across scheduling runs, so once set via the feedback loop it automatically applies to all future schedules for that task. You can clear it by setting it to `null` directly in the database or by building a reset UI.

---

## Architecture quick reference

| File | Role |
|---|---|
| `src/server/api/services/explain-service.ts` | Calls OpenAI to generate per-task explanations |
| `src/server/api/services/chat-schedule-service.ts` | Parses natural language feedback into a structured intent |
| `src/server/api/routers/scheduler.ts` | `explainSchedule`, `applyFeedbackAndPreview`, `confirmAndSave` tRPC endpoints |
| `src/server/lib/scheduler/ea-core.ts` | `computeTaskDebugInfo()` + `preferredStartAfter` penalty in `calculateFitness()` |
| `src/components/schedule-button.tsx` | Preview dialog with ℹ icons + feedback input UI |
| `prisma/schema.prisma` | `preferredStartAfter Int?` on `Task` model |
