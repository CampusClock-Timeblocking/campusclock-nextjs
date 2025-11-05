import type { SolverRequestPayload, SolverResponsePayload } from "./types";

export interface SolverClientOptions {
  baseUrl: string;
  timeoutMs?: number;
}

export class SolverClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(options: SolverClientOptions) {
    if (!options.baseUrl) {
      throw new Error("SolverClient requires a baseUrl");
    }

    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.timeoutMs = options.timeoutMs ?? 5000;
  }

  async solve(payload: SolverRequestPayload): Promise<SolverResponsePayload> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/solve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await safeJson(response);
        throw new Error(
          `Solver request failed (${response.status}): ${JSON.stringify(errorBody)}`,
        );
      }

      const data = (await response.json()) as SolverResponsePayload;
      return data;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Solver request timed out");
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (_) {
    return undefined;
  }
}

