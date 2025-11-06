export function getTaskInferencePrompt(
  title: string,
  description?: string | null,
  projectTitle?: string | null,
) {
  return `Analyze this task and provide realistic estimates:

Task: ${title}
${description ? `Description: ${description}` : ""}
${projectTitle ? `Project: ${projectTitle}` : ""}

Consider the complete picture:
- Setup time (preparation, gathering materials, travel to location)
- Actual execution time
- Cleanup or follow-up time
- Any waiting periods or dependencies
- Your energy level and focus requirements

**Duration (total minutes including overhead 1-1440):**
Think about how long this would realistically take from start to complete finish, not just the core activity.

**Priority (1-5):**
Consider urgency (when does this need to be done?) and importance (what impact does this have?).
- 5: Critical/urgent
- 3: Normal importance
- 1: Low priority/optional

**Complexity (1-10):**
Think about mental/physical effort, skill required, number of steps, unknowns, and potential obstacles.
- 1-3: Simple and straightforward
- 4-7: Moderate effort or planning needed
- 8-10: Difficult, complex, or unfamiliar`;
}
