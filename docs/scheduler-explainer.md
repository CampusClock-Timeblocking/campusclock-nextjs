# How the Scheduler Works — Plain English

---

## The Core Idea

Most calendar apps let *you* decide when to do things.
CampusClock decides for you — and gets better at it the more you use it.

---

## Part 1 — Building a Schedule

When you ask for a schedule, the app does three things:

### 1. Gather the facts
- What tasks do you have, and how long do they take?
- When are you already busy? (lectures, meetings, calendar events)
- When do you prefer to work, and at what hours are you most alert?

### 2. Evolve a solution
Rather than trying every possible combination (impossible), it mimics natural selection:

```
Start with 80 random schedules
    ↓
Score each one — penalise bad decisions, reward good ones
    ↓
Keep the best, combine and tweak them to create new ones
    ↓
Repeat for up to 300 rounds (< 10 seconds)
    ↓
Return the best schedule found
```

**What counts as "bad"?**
- Missing a deadline → heavy penalty
- Two tasks at the same time → heavy penalty
- Scheduling a hard task when your energy is low → lighter penalty

**What counts as "good"?**
- Getting important tasks done early
- Grouping tasks in the same location on the same day
- Matching complex work to your high-energy hours

### 3. Safety check
Any task that still breaks a hard rule (overlap, outside working hours, busy slot) is dropped. Better to schedule fewer tasks reliably than show a broken plan.

---

## Part 2 — Getting Smarter Over Time

Every time you mark a task as **completed**, the app quietly updates three things about you:

---

### 🕐 How long things actually take you

Everyone underestimates. If a task was estimated at 60 min but took you 90 min, the app remembers.
Next time it schedules that task (or similar ones), it books 90 min instead of 60.

> It doesn't change the task itself — just the time it reserves when planning.

---

### ⚡ When you have the most energy

If you consistently finish complex tasks faster than expected at 9am, the app infers that's a high-energy hour for you.
If you're slower at 3pm, it learns that too.

Over time it builds a personal hourly energy profile and uses it to put your hardest work in your best hours.

> Only complex tasks are used as signals — simple tasks don't tell us much about energy.

---

### ⏰ How much deadline pressure you need

If you keep missing deadlines, the scheduler starts treating them more urgently — booking tasks earlier and further from the deadline.
If you never miss them, it relaxes a little.

> It takes at least 5 completions before it reacts, so one bad week doesn't throw it off.

---

## The Feedback Loop

```
You use the app
      ↓
App builds a schedule using what it knows about you
      ↓
You complete tasks (or miss deadlines)
      ↓
App quietly updates your profile
      ↓
Next schedule is a little more accurate
      ↓
Repeat
```

No manual setup needed. The more you use it, the better it fits you.

---

## Key Numbers

| What | Detail |
|---|---|
| Schedules evaluated per run | up to 24,000 (80 × 300) |
| Time to generate a schedule | < 10 seconds |
| Observations to learn duration | ~20 completions |
| Observations to learn energy | ~20 completions per hour |
| Minimum completions before deadline pressure changes | 5 |
