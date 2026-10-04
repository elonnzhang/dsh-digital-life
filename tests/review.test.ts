import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { assertObjectJsonSchema } from "@deepseek-ai/dsh-tools";
import type { DigitalLifeRecord } from "../src/types.js";
import type { ReviewReport } from "../src/expert-types.js";
import { listReviewRuns, parseReviewReport, readReviewRun, renderReviewMarkdown, REVIEW_OUTPUT_SCHEMA, runExpertReview, type ReviewInvocation, type RunReviewOptions } from "../src/host/review.js";
import { importMimeograph, recordForPackage } from "../src/host/expert-packages.js";
import { packageBinding, packageFetcher } from "./expert-fixture.js";

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((path) => rm(path, { recursive: true, force: true }))); });

const records: DigitalLifeRecord[] = ["alpha", "beta", "critic"].map((id) => ({
  id, name: id, description: "Check evidence", category: "science", tags: [], persona: `Methods of ${id}`, enabled: true,
}));
function report(summary = "Check the baseline", evidenceIds = ["input:brief"]): ReviewReport {
  return { summary, findings: [{ claim: "The brief needs a baseline", kind: "observation", evidenceIds }], assumptions: ["No external experiment was run"], disagreements: [], nextActions: ["Define a measurable baseline"] };
}
async function setup(): Promise<RunReviewOptions> {
  const stateDir = await mkdtemp(join(tmpdir(), "expert-review-test-"));
  roots.push(stateDir);
  return {
    stateDir,
    records,
    request: { question: "Review this proposed experiment", expertIds: ["alpha", "beta"], reviewerId: "critic" },
    sessionId: "session-test",
    signal: new AbortController().signal,
    invoke: async () => report(),
  };
}
function supplied(invocation: ReviewInvocation) {
  return JSON.parse(invocation.prompt.split("\n\n").at(-1)!) as { evidence: Array<{ id: string }>; previousReports: Array<{ id: string }>; failedSteps: Array<{ id: string }> };
}

describe("fixed expert review workflow", () => {
  it("runs independent analysis before critique and synthesis, preserving every report", async () => {
    const options = await setup();
    const stages: string[] = [];
    options.invoke = async (input) => {
      stages.push(input.role);
      const previous = supplied(input).previousReports;
      expect(previous).toHaveLength(input.role === "analyst" ? 0 : input.role === "critic" ? 2 : 3);
      return report(`${input.role} by ${input.record.id}`);
    };
    const run = await runExpertReview(options);
    expect(stages).toEqual(["analyst", "analyst", "critic", "synthesizer"]);
    expect(run.status).toBe("completed");
    expect(run.experts).toHaveLength(3);
    expect(run.experts.every((item) => item.identitySha256.length === 64)).toBe(true);
    expect(await readReviewRun(run.id, options.stateDir)).toEqual(run);
    expect(await listReviewRuns(options.stateDir)).toMatchObject([{ id: run.id, status: "completed" }]);
    expect(renderReviewMarkdown(run)).toContain("analyst by alpha");
    expect(renderReviewMarkdown(run)).toContain("synthesizer by critic");
  });

  it("preserves successful analyses when a member fails", async () => {
    const options = await setup();
    options.invoke = async (input) => {
      if (input.record.id === "beta") throw new Error("provider unavailable");
      if (input.role !== "analyst") expect(supplied(input).failedSteps).toEqual([{ id: "analysis-2", error: "provider unavailable" }]);
      return report();
    };
    const run = await runExpertReview(options);
    expect(run.status).toBe("partial");
    expect(run.steps[0]?.status).toBe("completed");
    expect(run.steps[1]).toMatchObject({ status: "failed", error: "provider unavailable" });
    expect(run.steps.at(-1)?.status).toBe("completed");
  });

  it("does not synthesize when every analyst failed", async () => {
    const options = await setup();
    const invoke = vi.fn(async () => { throw new Error("no model"); });
    const run = await runExpertReview({ ...options, invoke });
    expect(run.status).toBe("failed");
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(run.steps.at(-1)?.status).toBe("cancelled");
  });

  it("cancels outstanding work and never starts critique after cancellation", async () => {
    const options = await setup();
    const controller = new AbortController();
    const started = Promise.withResolvers<void>();
    const invoke = vi.fn((input: ReviewInvocation) => {
      started.resolve();
      return new Promise<unknown>((_resolve, reject) => input.signal.addEventListener("abort", () => reject(input.signal.reason), { once: true }));
    });
    const running = runExpertReview({ ...options, signal: controller.signal, invoke });
    await started.promise;
    controller.abort(new Error("user stopped"));
    const run = await running;
    expect(run.status).toBe("cancelled");
    expect(invoke.mock.calls.every(([input]) => input.role === "analyst" && input.signal.aborted)).toBe(true);
    expect(run.steps.every((step) => step.status === "cancelled")).toBe(true);
    expect((await readReviewRun(run.id, options.stateDir)).status).toBe("cancelled");
  });

  it("returns a durable timeout even when a provider never settles", async () => {
    const options = await setup();
    const run = await runExpertReview({ ...options, timeoutMs: 50, invoke: () => new Promise(() => {}) });
    expect(run.status).toBe("timed-out");
    expect((await readReviewRun(run.id, options.stateDir)).status).toBe("timed-out");
  });

  it("rejects duplicate, disabled, missing or overlapping members before invocation", async () => {
    const options = await setup();
    const invoke = vi.fn(async () => report());
    await expect(runExpertReview({ ...options, invoke, request: { ...options.request, expertIds: ["alpha", "alpha"] } })).rejects.toThrow(/different/);
    await expect(runExpertReview({ ...options, invoke, request: { ...options.request, reviewerId: "alpha" } })).rejects.toThrow(/separate/);
    await expect(runExpertReview({ ...options, invoke, records: records.map((item) => ({ ...item, enabled: false })) })).rejects.toThrow(/enabled/);
    expect(invoke).not.toHaveBeenCalled();
  });

  it("snapshots actual supplied reference excerpts and restricts citation IDs per step", async () => {
    const options = await setup();
    const imported = recordForPackage(await importMimeograph(packageBinding, options.stateDir, packageFetcher()), "main");
    options.records = [imported, records[1]!, records[2]!];
    options.request.expertIds = [imported.id, "beta"];
    let methodId = "";
    options.invoke = async (input) => {
      const evidence = supplied(input).evidence;
      if (input.record.id === imported.id) {
        expect(evidence).toHaveLength(3);
        methodId = evidence[0]!.id;
        return report("The method suggests a baseline", [methodId]);
      }
      if (input.record.id === "beta") {
        expect(evidence).toHaveLength(0);
        return report("Invented source", ["not-supplied"]);
      }
      expect(evidence.map((item) => item.id)).toContain(methodId);
      return report("Synthesis uses supplied methods", [methodId]);
    };
    const run = await runExpertReview(options);
    expect(run.status).toBe("partial");
    expect(run.evidence[0]?.text).toContain("Compare alternatives");
    expect(run.steps[1]?.error).toContain("not supplied");
    expect(run.experts[0]?.expertPackage).toEqual({ ...packageBinding, ref: "main" });
  });

  it("rejects invented citations, unsupported output fields and unsupported observations", () => {
    expect(() => assertObjectJsonSchema(REVIEW_OUTPUT_SCHEMA)).not.toThrow();
    expect(() => parseReviewReport(report("Test", ["imaginary"]), new Set(["input:brief"]))).toThrow(/not supplied/);
    expect(() => parseReviewReport(report("Test", []), new Set())).toThrow(/require supplied evidence/);
    expect(() => parseReviewReport({ ...report(), extra: "unsupported" }, new Set(["input:brief"]))).toThrow(/schema/);
    expect(() => parseReviewReport(null, new Set())).toThrow(/object/);
  });

  it("rejects traversal when reading a stored review", async () => {
    await expect(readReviewRun("../settings", (await setup()).stateDir)).rejects.toThrow(/invalid review id/);
  });
});
