import { describe, expect, it } from "vitest";
import { mentionCandidates, normalizeTeam, requestFromTeam, suggestTeamId, teamError, teamIssues, teamsUsing } from "../src/client/teams.js";
import { validateSettings } from "../src/index.js";
import type { ExpertTeam } from "../src/expert-types.js";

const team: ExpertTeam = { id: "plan-review", name: "方案评审", purpose: "", analystIds: ["a", "b"], reviewerId: "c" };
const records = [
  { id: "a", enabled: true },
  { id: "b", enabled: false },
  { id: "c", enabled: true },
];

describe("expert team helpers", () => {
  it("reports missing and disabled members", () => {
    expect(teamIssues(team, records)).toEqual([{ id: "b", kind: "disabled" }]);
    expect(teamIssues({ ...team, reviewerId: "gone" }, records)).toEqual([
      { id: "b", kind: "disabled" },
      { id: "gone", kind: "missing" },
    ]);
    expect(teamIssues(team, records.map((record) => ({ ...record, enabled: true })))).toEqual([]);
  });

  it("normalizes drafts into a team the Host accepts", () => {
    const normalized = normalizeTeam({
      id: " plan-review ",
      name: " 方案评审 ",
      purpose: " 技术方案 ",
      analystIds: ["a", "a", " c ", "b"],
      reviewerId: " c ",
    });
    expect(normalized).toEqual({ id: "plan-review", name: "方案评审", purpose: "技术方案", analystIds: ["a", "b"], reviewerId: "c" });
    expect(() => validateSettings({ teams: [normalized] })).not.toThrow();
  });

  it("keeps a coordinator and member responsibilities only when set", () => {
    const normalized = normalizeTeam({
      ...team, coordinatorId: " c ", responsibilities: { a: " 统计方法 ", b: "  ", gone: "x" },
    });
    // Blank entries and entries for people no longer on the team are dropped.
    expect(normalized).toEqual({ ...team, coordinatorId: "c", responsibilities: { a: "统计方法" } });
    expect(normalizeTeam({ ...team, coordinatorId: " ", responsibilities: { a: " " } })).toEqual(team);
    expect(() => validateSettings({ teams: [normalizeTeam({ ...team, coordinatorId: "d", responsibilities: { d: "协调" } })] })).not.toThrow();
  });

  it("lists experts before teams as @ candidates", () => {
    const experts = [{ id: "a", name: "Alpha", description: "Stats", tags: ["data"] }];
    const teams = [team, { ...team, id: "a", name: "Clash", purpose: "conflict" }];
    expect(mentionCandidates(experts, teams, "").map((item) => [item.name, item.description, item.kind])).toEqual([
      ["a", "Alpha · Stats", "expert"],
      ["plan-review", "方案评审", "team"],
    ]);
    expect(mentionCandidates(experts, [{ ...team, purpose: "技术方案" }], "技术").map((item) => item.description)).toEqual(["方案评审 · 技术方案"]);
  });

  it("validates editor drafts", () => {
    expect(teamError(team, [], undefined, [])).toBeUndefined();
    expect(teamError({ ...team, id: "" }, [], undefined, [])).toEqual({ field: "id", reason: "required" });
    expect(teamError({ ...team, id: "Bad" }, [], undefined, [])).toEqual({ field: "id", reason: "invalidId" });
    expect(teamError(team, [team], undefined, [])).toEqual({ field: "id", reason: "duplicateId" });
    expect(teamError(team, [team], team.id, [])).toBeUndefined();
    expect(teamError({ ...team, name: "" }, [], undefined, [])?.field).toBe("name");
    expect(teamError({ ...team, analystIds: [] }, [], undefined, [])?.reason).toBe("analystCount");
    expect(teamError({ ...team, analystIds: ["a", "b", "d", "e"] }, [], undefined, [])?.reason).toBe("analystCount");
    expect(teamError({ ...team, reviewerId: "" }, [], undefined, [])?.field).toBe("reviewerId");
    expect(teamError({ ...team, id: "a" }, [], undefined, ["a", "b", "c"])).toEqual({ field: "id", reason: "idConflict" });
    expect(teamError({ ...team, id: "a" }, [], "a", ["a"])).toBeUndefined();
    expect(teamError({ ...team, responsibilities: { a: "x".repeat(201) } }, [], undefined, [])).toEqual({ field: "responsibilities", reason: "responsibilityLength" });
  });

  it("builds a review request from a lineup", () => {
    expect(requestFromTeam(team, "  Review this  ")).toEqual({ question: "Review this", expertIds: ["a", "b"], reviewerId: "c" });
    expect(requestFromTeam({ ...team, coordinatorId: "d", responsibilities: { a: "统计" } }, "Brief", "plan-review")).toEqual({
      question: "Brief", expertIds: ["a", "b"], reviewerId: "c", teamId: "plan-review",
    });
  });

  it("finds teams that reference a record", () => {
    expect(teamsUsing("c", [team])).toEqual([team]);
    expect(teamsUsing("a", [team])).toEqual([team]);
    expect(teamsUsing("x", [team])).toEqual([]);
  });

  it("suggests free ids", () => {
    expect(suggestTeamId("Plan Review!", [])).toBe("plan-review");
    expect(suggestTeamId("方案评审", [])).toBe("team");
    expect(suggestTeamId("Plan Review", [team, { ...team, id: "plan-review-2" }])).toBe("plan-review-3");
  });
});
