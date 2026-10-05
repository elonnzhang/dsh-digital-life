import { describe, expect, it } from "vitest";
import type { TeamRun } from "../src/expert-types.js";
import { renderTeamRunMarkdown } from "../src/host/team-render.js";

const run: TeamRun = {
  schemaVersion: 2, id: "review-00000000-0000-0000-0000-000000000000", sessionId: "s1", teamId: "plan-review",
  createdAt: "2026-10-04T00:00:00.000Z", updatedAt: "2026-10-04T00:01:00.000Z", status: "partial",
  briefs: [{ version: 1, text: "Original plan", source: "user", createdAt: "2026-10-04T00:00:00.000Z" }, { version: 2, text: "Budget 10k", source: "amendment", createdAt: "2026-10-04T00:00:30.000Z" }],
  members: [{ id: "alpha", name: "Alpha", roles: ["analyst"], responsibility: "统计方法", identity: "a", identitySha256: "0" }],
  evidence: [{ id: "alpha-ref", expertId: "alpha", path: "references/frameworks.md", revision: "r", sha256: "s", sourceUrl: "https://example.test/f", text: "t", truncated: true }],
  stages: [
    { id: "analysis-alpha-1", kind: "analysis", expertId: "alpha", briefVersion: 2, inputStageIds: [], evidenceIds: ["input:brief@2"], status: "failed", startedAt: "2026-10-04T00:00:40.000Z", error: "provider down" },
    { id: "synthesis-alpha-1", kind: "synthesis", expertId: "alpha", briefVersion: 2, inputStageIds: [], evidenceIds: [], status: "completed", startedAt: "2026-10-04T00:00:50.000Z",
      report: { summary: "Pilot first", findings: [], assumptions: [], nextActions: [], options: [{ name: "Pilot", tradeoffs: "Cheap" }],
        disagreements: [{ topic: "Sample", positions: [{ stageId: "a", position: "30" }, { stageId: "b", position: "100" }], type: "value", resolution: "human-decision" }],
        validationPlan: [{ task: "Run pilot", decides: "Size", stopCondition: "CI<10%" }], missingStages: ["analysis-alpha"] } },
  ],
  budget: { maxCalls: 10, callsUsed: 2, maxActiveMs: 600_000, activeMs: 192_000 },
};

describe("team run markdown", () => {
  it("puts synthesis first and includes every stage, brief version and evidence item", () => {
    const markdown = renderTeamRunMarkdown(run);
    expect(markdown.indexOf("Pilot first")).toBeLessThan(markdown.indexOf("analysis-alpha-1"));
    for (const text of ["Original plan", "Budget 10k", "provider down", "[value / human-decision] Sample", "Run pilot", "analysis-alpha", "https://example.test/f", "调用 2/10", "用时 3:12/10:00", "统计方法"])
      expect(markdown).toContain(text);
  });
});
