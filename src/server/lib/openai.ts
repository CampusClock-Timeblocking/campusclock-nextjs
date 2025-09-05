import OpenAI from "openai";
import { env } from "@/env";

let openaiClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI | null {
  if (!env.OPENAI_API_KEY) {
    console.warn("OpenAI API key not configured");
    return null;
  }

  openaiClient ??= new OpenAI({
    apiKey: env.OPENAI_API_KEY,
  });

  return openaiClient;
}
