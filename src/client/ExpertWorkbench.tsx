import type { ExpertCatalogEntry, ReviewRequest, ReviewRun, ReviewSummary } from "../expert-types.js";

/** Host calls behind the expert library and plan-review controls. */
export interface ExpertWorkbenchApi {
  /**
   * List the experts on a branch or tag.
   * `cached` means GitHub was unreachable and the locally cached catalog for the ref was used.
   */
  catalog: (ref: string) => Promise<{ ref: string; cached: boolean; experts: ExpertCatalogEntry[] }>;
  /** Import one expert from a branch or tag; returns the record id. */
  importExpert: (slug: string, ref: string) => Promise<string>;
  startReview: (request: ReviewRequest) => Promise<void>;
  listReviews: () => Promise<ReviewSummary[]>;
  readReview: (id: string) => Promise<{ run: ReviewRun; markdown: string }>;
  cancelReview: (id: string) => Promise<void>;
}

export function reviewSubmission(request: ReviewRequest, instruction: string): string {
  return `${instruction}\n\n${JSON.stringify(request, null, 2)}`;
}
