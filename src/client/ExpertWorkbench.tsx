import type { AnyReviewRun, ExpertCatalogEntry, ReviewSummary } from "../expert-types.js";
import type { LaunchRequest } from "./teams.js";

/** Host calls behind the expert library and plan-review controls. */
export interface ExpertWorkbenchApi {
  /**
   * List the experts on a branch or tag.
   * `cached` means GitHub was unreachable and the locally cached catalog for the ref was used.
   */
  catalog: (ref: string) => Promise<{ ref: string; cached: boolean; experts: ExpertCatalogEntry[] }>;
  /** Import one expert from a branch or tag; returns the record id. */
  importExpert: (slug: string, ref: string) => Promise<string>;
  startReview: (request: LaunchRequest) => Promise<void>;
  listReviews: () => Promise<ReviewSummary[]>;
  readReview: (id: string) => Promise<{ run: AnyReviewRun; markdown: string }>;
  cancelReview: (id: string) => Promise<void>;
  openReviewSession: (sessionId: string) => void;
}

/** Ask the main agent to orchestrate the team with start_team_run arguments. */
export function reviewSubmission(request: LaunchRequest, instruction: string): string {
  const args = request.teamId === undefined
    ? { brief: request.question, analystIds: request.expertIds, reviewerId: request.reviewerId }
    : { brief: request.question, teamId: request.teamId };
  return `${instruction}\n\n${JSON.stringify(args, null, 2)}`;
}
