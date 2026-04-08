import { describe, expect, it } from "vitest";
import { getTaskInferencePrompt } from "@/server/lib/infer-prompts";

describe("getTaskInferencePrompt", () => {
  it("includes project context when provided", () => {
    const prompt = getTaskInferencePrompt("Write thesis", "Chapter 1", {
      title: "Master Thesis",
      deadline: new Date("2026-04-15T10:00:00.000Z"),
      status: "IN_PROGRESS",
    });

    expect(prompt).toContain("Project: Master Thesis");
    expect(prompt).toContain("Project deadline: 2026-04-15");
    expect(prompt).toContain("Project status: in progress");
  });

  it("omits project lines when no project context is provided", () => {
    const prompt = getTaskInferencePrompt("Write thesis", "Chapter 1");

    expect(prompt).not.toContain("Project:");
    expect(prompt).not.toContain("Project deadline:");
    expect(prompt).not.toContain("Project status:");
  });
});
