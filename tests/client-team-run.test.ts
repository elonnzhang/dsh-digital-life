import { describe, expect, it } from "vitest";
import type { SynthesisReport, TeamRun, TeamStage } from "../src/expert-types.js";
import { budgetUsage, groupDisagreements, latestSynthesis, stageColumns, stageLines } from "../src/client/team-run-view.js";

const stage = (patch: Partial<TeamStage> & Pick<TeamStage, "id" | "kind" | "expertId">): TeamStage => ({
  briefVersion: 1, inputStageIds: [], evidenceIds: [], status: "completed", startedAt: "2026-10-04T00:00:00.000Z",
  ...(patch.status === "running" ? {} : { finishedAt: "2026-10-04T00:00:05.000Z" }),
  ...patch,
});
const synthesis: SynthesisReport = {
  summary: "Pilot first", findings: [], assumptions: [], nextActions: [], options: [], validationPlan: [], missingStages: [],
  disagreements: [
    { topic: "Size", positions: [{ stageId: "a", position: "30" }, { stageId: "b", position: "100" }], type: "value", resolution: "human-decision" },
    { topic: "Rate", positions: [{ stageId: "a", position: "2%" }, { stageId: "b", position: "5%" }], type: "fact", resolution: "gather-evidence" },
  ],
};
const run: TeamRun = {
  schemaVersion: 2, id: "review-1", sessionId: "s1", createdAt: "2026-10-04T00:00:00.000Z", updatedAt: "2026-10-04T00:01:00.000Z", status: "running",
  briefs: [{ version: 1, text: "Plan", source: "user", createdAt: "2026-10-04T00:00:00.000Z" }],
  members: [
    { id: "alpha", name: "Alpha", roles: ["analyst"], responsibility: "统计", identity: "a", identitySha256: "0" },
    { id: "beta", name: "Beta", roles: ["analyst"], responsibility: "综合分析", identity: "b", identitySha256: "1" },
    { id: "critic", name: "Critic", roles: ["coordinator", "reviewer"], responsibility: "综合分析", identity: "c", identitySha256: "2" },
  ],
  evidence: [],
  stages: [
    stage({ id: "analysis-alpha-1", kind: "analysis", expertId: "alpha", status: "failed", error: "provider down" }),
    stage({ id: "analysis-beta-1", kind: "analysis", expertId: "beta" }),
    stage({ id: "analysis-alpha-2", kind: "analysis", expertId: "alpha",
      report: { summary: "Stats ok", findings: [{ claim: "n=30", kind: "observation", evidenceIds: [] }], assumptions: [], disagreements: [], nextActions: [] } }),
    stage({ id: "synthesis-critic-1", kind: "synthesis", expertId: "critic", report: synthesis }),
    stage({ id: "review-critic-1", kind: "review", expertId: "critic", status: "running", startedAt: "2026-10-04T00:01:00.000Z" }),
  ],
  budget: { maxCalls: 10, callsUsed: 6, maxActiveMs: 600_000, activeMs: 192_000 },
};

describe("team run view helpers", () => {
  it("keeps the latest stage per member with retry counts and durations", () => {
    const columns = stageColumns(run, Date.parse("2026-10-04T00:01:30.000Z"));
    expect(columns.map((column) => column.kind)).toEqual(["brief", "analysis", "cross-critique", "review", "synthesis"]);
    expect(columns[0]!.nodes).toEqual([]);
    const analysis = columns[1]!.nodes;
    expect(analysis.map((node) => [node.stage.id, node.attempts, node.member?.responsibility])).toEqual([
      ["analysis-alpha-2", 2, "统计"],
      ["analysis-beta-1", 1, "综合分析"],
    ]);
    expect(analysis[0]!.durationMs).toBe(5_000);
    expect(columns[3]!.nodes[0]!.durationMs).toBe(30_000);
  });

  it("groups disagreements by type in a fixed order and skips empty groups", () => {
    expect(groupDisagreements(synthesis).map((group) => [group.type, group.items.map((item) => item.topic)])).toEqual([
      ["fact", ["Rate"]],
      ["value", ["Size"]],
    ]);
  });

  it("formats budget usage and finds the latest completed synthesis", () => {
    expect(budgetUsage(run)).toEqual({ calls: "6/10", time: "3:12/10:00" });
    expect(latestSynthesis(run)?.summary).toBe("Pilot first");
    expect(latestSynthesis({ ...run, stages: run.stages.filter((item) => item.kind !== "synthesis") })).toBeUndefined();
  });

  it("renders a stage report as markdown lines", () => {
    const analysis = run.stages[2]!;
    expect(stageLines(analysis)).toEqual(["Stats ok", "- [observation] n=30"]);
    expect(stageLines(run.stages[0]!)).toEqual([]);
  });
});
