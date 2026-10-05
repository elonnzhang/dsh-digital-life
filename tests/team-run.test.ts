import { describe, expect, it } from "vitest";
import type { ExpertReference, ReviewReport, TeamMember, TeamRun } from "../src/expert-types.js";
import { amendBrief, beginStage, createTeamRun, expireIfIdle, finishExecution, nextStages, planStage, recoverInterrupted, settleStage, TeamRunError } from "../src/host/team-run.js";

const member = (id: string, roles: TeamMember["roles"]): TeamMember => ({ id, name: id, roles, responsibility: "综合分析", identity: id, identitySha256: "0".repeat(64) });
const ref = (id: string, expertId: string): ExpertReference => ({ id, expertId, path: "references/frameworks.md", revision: "r", sha256: "s", sourceUrl: "u", text: "t", truncated: false });
const report: ReviewReport = { summary: "s", findings: [], assumptions: [], disagreements: [], nextActions: [] };
function run(analysts = ["alpha", "beta"]): TeamRun {
  return createTeamRun({
    id: "review-00000000-0000-0000-0000-000000000000", sessionId: "s1", brief: "Plan", now: "2026-10-04T00:00:00.000Z",
    members: [...analysts.map((id) => member(id, ["analyst"])), member("critic", ["reviewer", "coordinator"])],
    evidence: [ref("alpha-ref", "alpha"), ref("beta-ref", "beta")],
  });
}
function execute(target: TeamRun, kind: Parameters<typeof planStage>[1], fail: string[] = [], memberIds?: string[]) {
  const calls = planStage(target, kind, memberIds);
  beginStage(target, calls);
  for (const call of calls) settleStage(target, call.id, fail.includes(call.expertId) ? { status: "failed", error: "boom" } : { report });
  finishExecution(target, 1_000, "settled");
  return calls;
}

describe("team run state machine", () => {
  it("isolates analysis evidence and hides each analyst's own report from critique", () => {
    const target = run();
    const [alpha, beta] = execute(target, "analysis");
    expect(alpha).toMatchObject({ id: "analysis-alpha-1", inputStageIds: [], evidenceIds: ["input:brief@1", "alpha-ref"] });
    expect(beta?.evidenceIds).toEqual(["input:brief@1", "beta-ref"]);
    const critiques = execute(target, "cross-critique");
    expect(critiques[0]).toMatchObject({ id: "critique-alpha-1", inputStageIds: ["analysis-beta-1"], evidenceIds: ["input:brief@1", "beta-ref"] });
    const [review] = execute(target, "review");
    expect(review?.inputStageIds).toEqual(["analysis-alpha-1", "analysis-beta-1", "critique-alpha-1", "critique-beta-1"]);
    execute(target, "synthesis");
    expect(target.status).toBe("completed");
    expect(target.budget).toMatchObject({ callsUsed: 6, activeMs: 4_000 });
  });

  it("enforces preconditions and reports next stages without spending budget", () => {
    const target = run();
    expect(() => planStage(target, "review")).toThrow(TeamRunError);
    try { planStage(target, "synthesis"); } catch (error) { expect((error as TeamRunError).nextStages.map((item) => item.stage)).toEqual(["brief", "analysis"]); }
    expect(() => planStage(target, "review", ["alpha"])).toThrow(/memberIds/);
    expect(() => planStage(target, "analysis", ["critic"])).toThrow(/analysts/);
    execute(target, "analysis", ["beta"]);
    expect(() => planStage(target, "cross-critique")).toThrow(/2 completed/);
    expect(() => planStage(target, "brief")).toThrow(/before analysis/);
    expect(() => { amendBrief(target, "More"); }).toThrow(/after analysis/);
    expect(target.budget.callsUsed).toBe(2);
  });

  it("rejects duplicate stage members before creating calls or spending budget", () => {
    const target = run();
    expect(() => planStage(target, "analysis", ["alpha", "alpha"])).toThrow(/unique/);
    expect(target.stages).toEqual([]);
    expect(target.budget.callsUsed).toBe(0);
  });

  it("marks partial synthesis, flags stale downstream stages and completes after a retry", () => {
    const target = run();
    execute(target, "analysis", ["beta"]);
    execute(target, "review");
    expect(planStage(target, "synthesis")[0]?.requiredMissing).toEqual(["analysis-beta"]);
    execute(target, "synthesis");
    expect(target.status).toBe("partial");
    const retry = run();
    execute(retry, "analysis", ["beta"]);
    execute(retry, "review");
    expect(execute(retry, "analysis", [], ["beta"])[0]?.id).toBe("analysis-beta-2");
    expect(nextStages(retry).map((item) => item.stage)).toContain("review");
    expect(() => planStage(retry, "synthesis")).toThrow(/stale/);
    execute(retry, "review");
    execute(retry, "synthesis");
    expect(retry.status).toBe("completed");
  });

  it("rejects requests over budget whole and fails when budget runs out", () => {
    const target = run(["alpha", "beta", "gamma"]);
    target.budget.maxCalls = 4;
    execute(target, "analysis");
    expect(() => planStage(target, "cross-critique")).toThrow(/budget/);
    expect(target.budget.callsUsed).toBe(3);
    execute(target, "review");
    expect(target.status).toBe("failed");
  });

  it("separates explicit cancel, abort and timeout outcomes", () => {
    for (const [outcome, status] of [["cancelled", "cancelled"], ["aborted", "open"], ["timed-out", "timed-out"]] as const) {
      const target = run();
      const calls = planStage(target, "analysis");
      beginStage(target, calls);
      finishExecution(target, 10, outcome);
      expect(target.status).toBe(status);
      expect(target.stages.every((stage) => stage.status === "cancelled")).toBe(true);
    }
  });

  it("expires idle open runs and recovers runs interrupted by a Host restart", () => {
    const idle = run();
    expect(expireIfIdle(idle, Date.parse(idle.updatedAt) + 23 * 3_600_000)).toBe(false);
    expect(expireIfIdle(idle, Date.parse(idle.updatedAt) + 25 * 3_600_000)).toBe(true);
    expect(idle.status).toBe("expired");
    const crashed = run();
    beginStage(crashed, planStage(crashed, "analysis"));
    expect(recoverInterrupted(crashed)).toBe(true);
    expect(crashed).toMatchObject({ status: "open" });
    expect(crashed.stages.every((stage) => stage.status === "failed" && stage.error === "Host 已停止")).toBe(true);
  });

  it("appends brief versions and rejects writes after a terminal status", () => {
    const target = run();
    amendBrief(target, "Budget is 10k");
    expect(planStage(target, "analysis")[0]?.briefVersion).toBe(2);
    target.status = "cancelled";
    expect(() => planStage(target, "analysis")).toThrow(/finished/);
    expect(() => { amendBrief(target, "x"); }).toThrow(/finished/);
  });
});
