import { OpenAI } from "openai/client";
import { zodTextFormat } from "openai/helpers/zod";
import type { Reasoning, ResponsesModel } from "openai/resources/shared";
import type z from "zod";
import type { BaseMessage } from "./schemas";

export class OpenAILLM {
  private client: OpenAI;
  private model: ResponsesModel;

  constructor(opts: { apiKey: string; model?: ResponsesModel }) {
    this.client = new OpenAI({ apiKey: opts.apiKey });
    this.model = opts.model ?? "gpt-5-nano-2025-08-07";
  }

  async generate<T extends z.ZodType>(params: {
    messages: BaseMessage[];
    schema: T;
    schemaName: string;
    reasoning?: Reasoning;
  }): Promise<z.infer<T>> {
    const response = await this.client.responses.parse({
      model: this.model,
      input: params.messages,
      text: {
        format: zodTextFormat(params.schema, params.schemaName),
      },
      reasoning: params.reasoning,
      store: false,
    });

    const parsed = response.output_parsed;
    if (!parsed) {
      throw new Error(
        `Structured output refused or empty for "${params.schemaName}"`,
      );
    }

    return parsed;
  }

  async generateText(params: {
    input: BaseMessage[];
    reasoning?: Reasoning;
  }): Promise<BaseMessage> {
    const response = await this.client.responses.create({
      model: this.model,
      input: params.input,
      reasoning: params.reasoning,
      store: false,
    });

    return {
      role: "assistant",
      content: response.output_text,
    };
  }
}
