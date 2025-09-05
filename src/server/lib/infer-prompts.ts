import type { SimilarTaskFeedback } from "@/server/api/services/feedback-embedding-service";

export interface TaskInferenceProjectContext {
  title: string;
  deadline?: Date | null;
  status?: string | null;
}

function formatProjectDeadline(deadline: Date): string {
  const isoDate = deadline.toISOString().slice(0, 10);
  return isoDate ?? "unknown";
}

function formatProjectStatus(status: string): string {
  return status.toLowerCase().replaceAll("_", " ");
}

export function getTaskInferencePrompt(
  title: string,
  description?: string | null,
  projectContext?: TaskInferenceProjectContext,
) {
  const projectLines: string[] = [];
  if (projectContext?.title) {
    projectLines.push(`Project: ${projectContext.title}`);
  }
  if (projectContext?.deadline) {
    projectLines.push(
      `Project deadline: ${formatProjectDeadline(projectContext.deadline)}`,
    );
  }
  if (projectContext?.status) {
    projectLines.push(
      `Project status: ${formatProjectStatus(projectContext.status)}`,
    );
  }
  const projectBlock = projectLines.join("\n");

  return `Analyze this task and provide realistic estimates:

Task: ${title}
${description ? `Description: ${description}` : ""}
${projectBlock}

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

export function getTaskInferencePromptWithHistory(
  title: string,
  description: string | null | undefined,
  projectContext: TaskInferenceProjectContext | undefined,
  similarTasks: SimilarTaskFeedback[],
): string {
  const basePrompt = getTaskInferencePrompt(title, description, projectContext);

  if (similarTasks.length === 0) {
    return basePrompt;
  }

  const historySection = similarTasks
    .map((t, i) => {
      const lines = [
        `${i + 1}. "${t.taskTitle}" (similarity: ${(t.similarity * 100).toFixed(0)}%)`,
        `   - Estimated: ${t.estimatedDurationMinutes ?? "?"}min, complexity ${t.estimatedComplexity ?? "?"}/10, priority ${t.estimatedPriority ?? "?"}/5`,
        `   - Actual: ${t.actualDurationMinutes}min, user-rated complexity ${t.userComplexity}/10`,
      ];
      if (t.feedbackText) {
        lines.push(`   - User note: "${t.feedbackText}"`);
      }
      return lines.join("\n");
    })
    .join("\n");

  return `${basePrompt}

**IMPORTANT: Historical data from similar completed tasks by this user:**
The following similar tasks have been completed before. Use this data to calibrate your estimates.
If the user consistently reports tasks take longer than estimated, adjust upward. If they rate complexity differently than the system estimated, adjust accordingly.

${historySection}

Use this historical feedback to provide more personalized and accurate estimates.`;
}
