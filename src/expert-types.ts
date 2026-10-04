import type { DigitalLifeCategory } from "./types.js";

export const MIMEOGRAPHS_REVISION = "a38f5fcad0853be3e98a6cd95d8e6bf8c66f7c7b";

export interface ExpertPackageBinding {
  source: "mimeographs";
  slug: string;
  /** Commit the files are stored and verified under; internal, never shown to the user. */
  revision: string;
  /** Branch or tag the user imported from; this is the version shown to the user. */
  ref: string;
}

/** Where an imported package is stored; the branch or tag it came from is not part of it. */
export type ExpertPackageLocation = Omit<ExpertPackageBinding, "ref">;

/** A saved review lineup: 1–3 analysts critiqued and synthesized by one reviewer. */
export interface ExpertTeam {
  id: string;
  name: string;
  /** What this lineup is meant to review; shown to the user only. */
  purpose: string;
  /** 1–3 unique record ids. */
  analystIds: string[];
  /** Record id; never one of the analysts. */
  reviewerId: string;
}

export interface ExpertCatalogEntry {
  slug: string;
  name: string;
  description: string;
  category: DigitalLifeCategory;
  references: string[];
}

export interface ExpertPackageManifest extends ExpertPackageLocation {
  schemaVersion: 1;
  name: string;
  description: string;
  category: DigitalLifeCategory;
  importedAt: string;
  sourceType: "public-method";
  reviewStatus: "unreviewed";
  files: Array<{ path: string; sha256: string; bytes: number }>;
}

export interface ExpertReference {
  id: string;
  expertId: string;
  path: string;
  revision: string;
  sha256: string;
  sourceUrl: string;
  text: string;
  truncated: boolean;
}

export interface ReviewRequest {
  question: string;
  expertIds: string[];
  reviewerId: string;
}

export interface ReviewReport {
  summary: string;
  findings: Array<{
    claim: string;
    kind: "observation" | "inference" | "proposal";
    evidenceIds: string[];
  }>;
  assumptions: string[];
  disagreements: string[];
  nextActions: string[];
}

export type ReviewRole = "analyst" | "critic" | "synthesizer";
export type ReviewStatus = "running" | "completed" | "partial" | "failed" | "cancelled" | "timed-out";

export interface ReviewStep {
  id: string;
  role: ReviewRole;
  expertId: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  report?: ReviewReport;
  error?: string;
}

export interface ReviewRun {
  schemaVersion: 1;
  id: string;
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  status: ReviewStatus;
  request: ReviewRequest;
  experts: Array<{
    id: string;
    name: string;
    identity: string;
    identitySha256: string;
    model?: { provider?: string; model?: string };
    expertPackage?: ExpertPackageBinding;
  }>;
  evidence: ExpertReference[];
  steps: ReviewStep[];
  error?: string;
}

export type ReviewSummary = Pick<ReviewRun, "id" | "status" | "createdAt" | "updatedAt"> & {
  question: string;
};
