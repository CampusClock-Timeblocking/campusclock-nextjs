import OpenAI from "openai";
import { env } from "@/env";
import { get } from "http";
import { getTaskInferencePrompt } from "./infer-prompts";

let openaiClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI | null {
  if (!env.OPENAI_API_KEY) {
    console.warn("OpenAI API key not configured");
    return null;
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }

  return openaiClient;
}
