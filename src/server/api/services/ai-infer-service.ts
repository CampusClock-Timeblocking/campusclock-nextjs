import { aiTaskInferenceResultSchema, type CreateTaskInput } from "@/lib/zod";
import { getTaskInferencePrompt } from "@/server/lib/infer-prompts";
import { getOpenAIClient } from "@/server/lib/openai";
import { zodResponseFormat } from "openai/helpers/zod";

export enum InferenceStatus {
  SUCCESS,
  FAILURE,
  NO_INFERENCE_NEEDED,
}

export interface InferenceResult<T> {
  status: InferenceStatus;
  data?: T;
}

export async function inferMissingTaskFields(task: CreateTaskInput) {
  const shouldInfer =
    !task.durationMinutes || !task.priority || !task.complexity;
  if (!shouldInfer)
    return {
      status: InferenceStatus.NO_INFERENCE_NEEDED,
      data: {
        ...task,
        durationMinutes: task.durationMinutes!,
        priority: task.priority!,
        complexity: task.complexity!,
      },
    };

  const client = getOpenAIClient();

  if (!client) {
    throw new Error(
      "OpenAI client not available. Please configure OPENAI_API_KEY.",
    );
  }

  const { title, description } = task;
  const prompt = getTaskInferencePrompt(title, description);

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a productivity expert who provides accurate task estimates.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
      response_format: zodResponseFormat(
        aiTaskInferenceResultSchema,
        "task_inference",
      ),
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error("No response from OpenAI");
    }

    const result = aiTaskInferenceResultSchema.parse(
      JSON.parse(responseContent),
    );

    return {
      status: InferenceStatus.SUCCESS,
      data: {
        ...task,
        durationMinutes: task.durationMinutes ?? result.durationMinutes,
        priority: task.priority ?? result.priority,
        complexity: task.complexity ?? result.complexity,
      },
    };
  } catch (error) {
    console.error("Error inferring task fields:", error);
    return {
      status: InferenceStatus.FAILURE,
      data: {
        ...task,
        durationMinutes: task.durationMinutes ?? 15,
        priority: task.priority ?? 3,
        complexity: task.complexity ?? 5,
      },
    };
  }
}
