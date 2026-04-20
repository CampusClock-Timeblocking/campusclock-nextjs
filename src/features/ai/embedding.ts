import { getOpenAIClient } from "@/server/lib/openai";
import type { EmbeddingModel } from "openai/resources/embeddings.mjs";

const DEFAULT_MODEL: EmbeddingModel = "text-embedding-3-large";
const DEFAULT_DIMENSIONS = 1536;

export class OpenAIEmbedder {
  private model: EmbeddingModel;
  private dimensions: number;

  constructor(opts?: { model?: EmbeddingModel; dimensions?: number }) {
    this.model = opts?.model ?? DEFAULT_MODEL;
    this.dimensions = opts?.dimensions ?? DEFAULT_DIMENSIONS;
  }

  async embed(text: string): Promise<number[]> {
    const client = getOpenAIClient();
    if (!client) {
      throw new Error(
        "OpenAI client not available. Please configure OPENAI_API_KEY.",
      );
    }

    const response = await client.embeddings.create({
      model: this.model,
      input: text,
      dimensions: this.dimensions,
      encoding_format: "float",
    });

    const embedding = response.data[0]?.embedding;
    if (!embedding) throw new Error("No embedding returned from OpenAI");

    return embedding;
  }
}
