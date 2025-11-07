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
    const solveUrl = `${this.baseUrl}/solve`;
    console.log("🔧 [SolverClient] Starting solve request");
    console.log("🔧 [SolverClient] Base URL:", this.baseUrl);
    console.log("🔧 [SolverClient] Solve endpoint:", solveUrl);
    console.log("🔧 [SolverClient] Timeout:", this.timeoutMs, "ms");
    console.log("🔧 [SolverClient] Payload size:", JSON.stringify(payload).length, "bytes");

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      console.error(`❌ [SolverClient] Request timeout reached (${this.timeoutMs}ms) - aborting`);
      controller.abort();
    }, this.timeoutMs);

    const startTime = Date.now();

    try {
      console.log("🔧 [SolverClient] Initiating POST request...");
      
      const response = await fetch(solveUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const elapsed = Date.now() - startTime;
      console.log(`🔧 [SolverClient] Response received in ${elapsed}ms`);
      console.log("🔧 [SolverClient] Status:", response.status);
      console.log("🔧 [SolverClient] Status text:", response.statusText);

      if (!response.ok) {
        console.error(`❌ [SolverClient] Non-OK status: ${response.status}`);
        const errorBody = await safeJson(response);
        console.error("❌ [SolverClient] Error body:", errorBody);
        throw new Error(
          `Solver request failed (${response.status}): ${JSON.stringify(errorBody)}`,
        );
      }

      console.log("🔧 [SolverClient] Parsing response JSON...");
      const data = (await response.json()) as SolverResponsePayload;
      console.log("✅ [SolverClient] Request successful");
      console.log("✅ [SolverClient] Solution status:", data.status);
      console.log("✅ [SolverClient] Scheduled tasks:", data.variables?.length ?? 0);
      
      return data;
    } catch (error) {
      const elapsed = Date.now() - startTime;
      console.error(`❌ [SolverClient] Request failed after ${elapsed}ms`);
      console.error("❌ [SolverClient] Error type:", error?.constructor?.name);
      console.error("❌ [SolverClient] Error message:", error instanceof Error ? error.message : "Unknown");
      
      if (error instanceof Error) {
        console.error("❌ [SolverClient] Error stack:", error.stack);
        
        if (error.name === "AbortError") {
          console.error(`❌ [SolverClient] Request aborted - likely timeout (${this.timeoutMs}ms)`);
          throw new Error(`Solver request timed out after ${this.timeoutMs}ms`);
        } else if (error.message.includes("ECONNREFUSED")) {
          console.error("❌ [SolverClient] Connection refused - solver service not running or not reachable");
        } else if (error.message.includes("ENOTFOUND")) {
          console.error("❌ [SolverClient] DNS lookup failed - check solver service URL");
        } else if (error.message.includes("ETIMEDOUT")) {
          console.error("❌ [SolverClient] TCP connection timeout");
        }
      }
      
      throw error;
    } finally {
      clearTimeout(timeout);
      const totalTime = Date.now() - startTime;
      console.log(`🔧 [SolverClient] Total request time: ${totalTime}ms`);
    }
  }
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    console.error(error);
    return undefined;
  }
}
