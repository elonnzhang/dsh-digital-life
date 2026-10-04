import type { ExpertTeam, ReviewRequest } from "../expert-types.js";
import type { DigitalLifeRecord } from "../types.js";

/** Most analysts one review accepts (mirrors the Host review validator). */
export const MAX_ANALYSTS = 3;

/** Pattern shared by record and team ids. */
export const ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

/** A team member that cannot take part in a review right now. */
export interface TeamIssue {
  id: string;
  kind: "missing" | "disabled";
}

/**
 * List the members that block launching a review with this team.
 * @param team Saved lineup.
 * @param records Current digital-life records.
 * @returns Missing or disabled members, analysts first.
 */
export function teamIssues(
  team: Pick<ExpertTeam, "analystIds" | "reviewerId">,
  records: readonly Pick<DigitalLifeRecord, "id" | "enabled">[],
): TeamIssue[] {
  const byId = new Map(records.map((record) => [record.id, record]));
  return [...team.analystIds, team.reviewerId].flatMap((id): TeamIssue[] => {
    const record = byId.get(id);
    if (record === undefined) return [{ id, kind: "missing" }];
    return record.enabled ? [] : [{ id, kind: "disabled" }];
  });
}

/**
 * Trim a team draft and drop duplicate analysts and an analyst reused as reviewer.
 * @param draft Team entered in the editor.
 * @returns The team as it is stored.
 */
export function normalizeTeam(draft: ExpertTeam): ExpertTeam {
  const reviewerId = draft.reviewerId.trim();
  const analystIds = [...new Set(draft.analystIds.map((id) => id.trim()))].filter(
    (id) => id !== "" && id !== reviewerId,
  );
  return {
    id: draft.id.trim(),
    name: draft.name.trim(),
    purpose: draft.purpose.trim(),
    analystIds,
    reviewerId,
  };
}

/** Editor field that failed validation. */
export type TeamField = "id" | "name" | "analystIds" | "reviewerId";

/**
 * Check a normalized team before it is written.
 * @param team Normalized team.
 * @param teams Saved teams.
 * @param editingId Id of the team being edited, if any.
 * @returns The first failing field and its reason, or undefined when valid.
 */
export function teamError(
  team: ExpertTeam,
  teams: readonly ExpertTeam[],
  editingId: string | undefined,
): { field: TeamField; reason: "required" | "invalidId" | "duplicateId" | "analystCount" } | undefined {
  if (team.id === "") return { field: "id", reason: "required" };
  if (!ID_PATTERN.test(team.id)) return { field: "id", reason: "invalidId" };
  if (team.id !== editingId && teams.some((item) => item.id === team.id)) return { field: "id", reason: "duplicateId" };
  if (team.name === "") return { field: "name", reason: "required" };
  if (team.analystIds.length < 1 || team.analystIds.length > MAX_ANALYSTS)
    return { field: "analystIds", reason: "analystCount" };
  if (team.reviewerId === "") return { field: "reviewerId", reason: "required" };
  return undefined;
}

/**
 * Build the review request a team runs.
 * @param lineup Analysts and reviewer.
 * @param question Brief entered by the user.
 * @returns The request sent to the review tool.
 */
export function requestFromTeam(
  lineup: Pick<ExpertTeam, "analystIds" | "reviewerId">,
  question: string,
): ReviewRequest {
  return { question: question.trim(), expertIds: [...lineup.analystIds], reviewerId: lineup.reviewerId };
}

/**
 * Teams that reference a record, used to warn before deleting it.
 * @param recordId Record about to be removed.
 * @param teams Saved teams.
 * @returns Teams naming the record as analyst or reviewer.
 */
export function teamsUsing(recordId: string, teams: readonly ExpertTeam[]): ExpertTeam[] {
  return teams.filter((team) => team.reviewerId === recordId || team.analystIds.includes(recordId));
}

/**
 * Derive a free team id from its name, falling back to `team`.
 * @param name Team name.
 * @param teams Saved teams.
 * @returns An id matching the record id pattern and unused by `teams`.
 */
export function suggestTeamId(name: string, teams: readonly ExpertTeam[]): string {
  const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "team";
  const taken = new Set(teams.map((team) => team.id));
  if (!taken.has(base)) return base;
  let index = 2;
  while (taken.has(`${base}-${index}`)) index += 1;
  return `${base}-${index}`;
}
