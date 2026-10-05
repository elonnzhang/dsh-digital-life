import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { validateJsonSchemaValue, type ObjectJsonSchema } from "@deepseek-ai/dsh-tools";
import type { DigitalLifeRecord } from "../types.js";
import type { AnyReviewRun, ReviewReport, ReviewRequest, ReviewRun, ReviewSummary, TeamRun } from "../expert-types.js";
import { digitalLifeHome } from "./identity.js";

const RUN_ID = /^review-[a-f0-9-]{36}$/;

export const REVIEW_OUTPUT_SCHEMA: ObjectJsonSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    findings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          claim: { type: "string" },
          kind: { type: "string", enum: ["observation", "inference", "proposal"] },
          evidenceIds: { type: "array", items: { type: "string" } },
        },
        required: ["claim", "kind", "evidenceIds"],
        additionalProperties: false,
      },
    },
    assumptions: { type: "array", items: { type: "string" } },
    disagreements: { type: "array", items: { type: "string" } },
    nextActions: { type: "array", items: { type: "string" } },
  },
  required: ["summary", "findings", "assumptions", "disagreements", "nextActions"],
  additionalProperties: false,
};

export function validateReviewRequest(request: ReviewRequest, records: readonly DigitalLifeRecord[]): DigitalLifeRecord[] {
  if (typeof request?.question !== "string" || request.question.trim() === "" || request.question.length > 20_000)
    throw new Error("digital-life: review question must contain 1-20000 characters");
  if (!Array.isArray(request.expertIds) || request.expertIds.length < 1 || request.expertIds.length > 3 ||
      request.expertIds.some((id) => typeof id !== "string") || new Set(request.expertIds).size !== request.expertIds.length ||
      typeof request.reviewerId !== "string" || request.expertIds.includes(request.reviewerId))
    throw new Error("digital-life: choose 1-3 different analysts and a separate reviewer");
  return [...request.expertIds, request.reviewerId].map((id) => {
    const record = records.find((item) => item.id === id && item.enabled);
    if (record === undefined) throw new Error(`digital-life: enabled expert not found: ${id}`);
    return record;
  });
}

export function parseReviewReport(value: unknown, evidenceIds: ReadonlySet<string>): ReviewReport {
  if (typeof value !== "object" || value === null) throw new Error("digital-life: review output must be an object");
  if (validateJsonSchemaValue(REVIEW_OUTPUT_SCHEMA, value).length > 0 || JSON.stringify(value).length > 24_000)
    throw new Error("digital-life: review output does not match the schema or exceeds the report limit");
  const report = value as ReviewReport;
  const text = (item: unknown): item is string => typeof item === "string" && item.trim() !== "" && item.length <= 8_000;
  const texts = (items: unknown): items is string[] => Array.isArray(items) && items.length <= 30 && items.every(text);
  if (!text(report.summary) || !Array.isArray(report.findings) || report.findings.length > 30 ||
      !texts(report.assumptions) || !texts(report.disagreements) || !texts(report.nextActions))
    throw new Error("digital-life: invalid structured review report");
  for (const finding of report.findings) {
    if (typeof finding !== "object" || finding === null || !text(finding.claim) ||
        !["observation", "inference", "proposal"].includes(finding.kind) || !Array.isArray(finding.evidenceIds) ||
        finding.evidenceIds.length > 20 || finding.evidenceIds.some((id) => typeof id !== "string" || !evidenceIds.has(id)))
      throw new Error("digital-life: invalid finding or citation to evidence not supplied to this step");
    if (finding.kind === "observation" && finding.evidenceIds.length === 0)
      throw new Error("digital-life: observations require supplied evidence");
  }
  return structuredClone(report);
}

function runPath(id: string, stateDir?: string): string {
  if (!RUN_ID.test(id)) throw new Error("digital-life: invalid review id");
  return join(digitalLifeHome(process.env, stateDir), ".expert-reviews", `${id}.json`);
}

export async function saveReviewRun(run: AnyReviewRun, stateDir?: string): Promise<void> {
  const path = runPath(run.id, stateDir);
  await mkdir(join(digitalLifeHome(process.env, stateDir), ".expert-reviews"), { recursive: true, mode: 0o700 });
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, JSON.stringify(run, null, 2), { mode: 0o600, flag: "wx" });
    await rename(temporary, path);
  } finally {
    await rm(temporary, { force: true });
  }
}

/** Read either a legacy fixed review (v1) or a team run (v2). */
export async function readAnyReviewRun(id: string, stateDir?: string): Promise<AnyReviewRun> {
  const value = JSON.parse(await readFile(runPath(id, stateDir), "utf8")) as AnyReviewRun;
  if (value?.id !== id) throw new Error("digital-life: invalid saved review");
  if (value.schemaVersion === 1) {
    if (!Array.isArray(value.steps) || !Array.isArray(value.evidence) || !value.request || typeof value.request.question !== "string")
      throw new Error("digital-life: invalid saved review");
    return value;
  }
  if (value.schemaVersion !== 2 || !Array.isArray(value.briefs) || value.briefs.length === 0 || !Array.isArray(value.members) ||
      !Array.isArray(value.stages) || !Array.isArray(value.evidence) || typeof value.budget !== "object")
    throw new Error("digital-life: invalid saved review");
  return value;
}

/** Read a legacy v1 review; v1 records are read-only. */
export async function readReviewRun(id: string, stateDir?: string): Promise<ReviewRun> {
  const value = await readAnyReviewRun(id, stateDir);
  if (value.schemaVersion !== 1) throw new Error("digital-life: invalid saved review");
  return value;
}

/** Read a team run (v2). */
export async function readTeamRun(id: string, stateDir?: string): Promise<TeamRun> {
  const value = await readAnyReviewRun(id, stateDir);
  if (value.schemaVersion !== 2) throw new Error("digital-life: legacy reviews are read-only");
  return value;
}

export async function listReviewRuns(stateDir?: string): Promise<ReviewSummary[]> {
  let paths: string[];
  try {
    paths = await readdir(join(digitalLifeHome(process.env, stateDir), ".expert-reviews"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const runs = await Promise.all(paths.filter((path) => path.endsWith(".json") && RUN_ID.test(path.slice(0, -5)))
    .map((path) => readAnyReviewRun(path.slice(0, -5), stateDir)));
  return runs.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 30).map((run) => ({
    id: run.id, status: run.status, createdAt: run.createdAt, updatedAt: run.updatedAt, schemaVersion: run.schemaVersion,
    question: (run.schemaVersion === 1 ? run.request.question : run.briefs[0]!.text).slice(0, 200),
  }));
}

export function aborted<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) {
    void promise.catch(() => {});
    return Promise.reject(signal.reason);
  }
  return new Promise((resolve, reject) => {
    const cancel = (): void => reject(signal.reason);
    signal.addEventListener("abort", cancel, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", cancel));
  });
}

export function renderReviewMarkdown(run: ReviewRun): string {
  const lines = ["# Expert plan review", "", `Run: ${run.id}`, `Status: ${run.status}`, "", "## Brief", "", run.request.question];
  if (run.error !== undefined) lines.push("", `Error: ${run.error}`);
  for (const step of run.steps) {
    lines.push("", `## ${step.role}: ${step.expertId}`, "", `Status: ${step.status}`);
    if (step.error !== undefined) lines.push("", step.error);
    if (step.report === undefined) continue;
    const report = step.report;
    lines.push("", report.summary);
    for (const finding of report.findings)
      lines.push("", `- [${finding.kind}] ${finding.claim}${finding.evidenceIds.length ? ` (${finding.evidenceIds.join(", ")})` : ""}`);
    for (const [title, values] of [["Assumptions", report.assumptions], ["Disagreements", report.disagreements], ["Next actions", report.nextActions]] as const) {
      if (values.length) lines.push("", `### ${title}`, "", ...values.map((value) => `- ${value}`));
    }
  }
  lines.push("", "## Supplied evidence", "", "input:brief - User-provided brief (not independently verified).");
  for (const evidence of run.evidence)
    lines.push("", `- ${evidence.id}: ${evidence.sourceUrl}${evidence.truncated ? " (excerpt truncated)" : ""}`);
  return `${lines.join("\n")}\n`;
}
