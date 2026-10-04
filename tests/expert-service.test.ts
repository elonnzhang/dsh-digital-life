import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Agent } from "@deepseek-ai/dsh-agent";
import type { ToolExecution } from "@deepseek-ai/dsh-tools";
import type { SubagentStartRequest } from "@deepseek-ai/dsh-subagent";
import type { ReviewReport, ReviewRun } from "../src/expert-types.js";
import type { DigitalLifeRecord } from "../src/types.js";
import { createExpertService } from "../src/host/expert-service.js";
import { readReviewRun, saveReviewRun } from "../src/host/review.js";

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((path) => rm(path, { recursive: true, force: true }))); });
const report: ReviewReport = { summary: "Check evidence", findings: [], assumptions: ["Needs external validation"], disagreements: [], nextActions: ["Run a controlled comparison"] };
const records: DigitalLifeRecord[] = ["analyst", "reviewer"].map((id) => ({ id, name: id, description: id, category: "science", tags: [], persona: `Method ${id}`, enabled: true }));
const request = { question: "Evaluate the study plan", expertIds: ["analyst"], reviewerId: "reviewer" };
type RegisteredTool = { name: string; execute: (args: unknown, exec: ToolExecution) => Promise<unknown> };

async function fixture(structured = true) {
  const stateDir = await mkdtemp(join(tmpdir(), "expert-service-test-"));
  roots.push(stateDir);
  const registered = new Map<string, RegisteredTool>();
  const dispose = vi.fn(async () => {});
  const start = vi.fn(async (_provider: string, _request: SubagentStartRequest) => ({
    id: "child",
    result: Promise.resolve({ stopReason: "completed", output: [{ type: "text", text: JSON.stringify(report) }], ...(structured ? { structured: report } : {}) }),
    dispose,
  }));
  const parent = { id: "session-fixture", ctx: {
    subagents: { getProvider: () => ({ capabilities: { persona: true, toolFilter: true, outputSchema: structured, agentOptions: true } }), start },
    tools: { register: (tool: RegisteredTool) => { registered.set(tool.name, tool); return () => registered.delete(tool.name); } },
  } } as unknown as Agent;
  const service = createExpertService({ current: () => ({ provider: "spawn", maxBatchSize: 3, records }), stateDir: () => stateDir });
  const unregister = service.registerTools(parent);
  const signal = new AbortController().signal;
  const exec = { agent: parent, signal } as ToolExecution;
  return { stateDir, registered, dispose, start, parent, service, exec, unregister };
}

describe("expert Host service", () => {
  it("registers real tool definitions and delegates isolated, structured stages", async () => {
    const f = await fixture();
    expect([...f.registered.keys()]).toEqual(["read_expert_reference", "review_expert_plan", "read_expert_review"]);
    const result = await f.registered.get("review_expert_plan")!.execute(request, f.exec) as { id: string; status: string };
    expect(result.status).toBe("completed");
    expect(f.start).toHaveBeenCalledTimes(3);
    expect(f.dispose).toHaveBeenCalledTimes(3);
    for (const [provider, input] of f.start.mock.calls) {
      expect(provider).toBe("spawn");
      expect(input.toolFilter).toEqual({ allow: [] });
      expect(input.outputSchema?.type).toBe("object");
      expect(input.parent).toBe(f.parent);
      expect(input.persona).toMatch(/^Method/);
    }
    expect(await f.service.rpc("review/read", { id: result.id })).toMatchObject({ ok: true, value: { run: { status: "completed" } } });
    f.unregister();
    expect(f.registered.size).toBe(0);
  });

  it("validates JSON output when the provider has no outputSchema capability", async () => {
    const f = await fixture(false);
    const result = await f.registered.get("review_expert_plan")!.execute(request, f.exec) as { status: string };
    expect(result.status).toBe("completed");
    expect(f.start.mock.calls.every(([, input]) => input.outputSchema === undefined)).toBe(true);
  });

  it("stops an active run through RPC and keeps its cancellation record", async () => {
    const f = await fixture();
    const started = Promise.withResolvers<void>();
    f.start.mockImplementation(async (_provider, input) => {
      started.resolve();
      return {
        id: "waiting-child", dispose: f.dispose,
        result: new Promise((_resolve, reject) => input.signal.addEventListener("abort", () => reject(input.signal.reason), { once: true })),
      };
    });
    const running = f.registered.get("review_expert_plan")!.execute(request, f.exec);
    await started.promise;
    const listing = await f.service.rpc("review/list", {});
    const id = (listing.ok ? listing.value as Array<{ id: string }> : [])[0]!.id;
    expect(await f.service.rpc("review/cancel", { id })).toMatchObject({ ok: true });
    expect(await running).toMatchObject({ status: "cancelled" });
    expect((await readReviewRun(id, f.stateDir)).status).toBe("cancelled");
    expect(f.start).toHaveBeenCalledTimes(1);
  });

  it("marks unfinished runs from a stopped Host as failed instead of running forever", async () => {
    const f = await fixture();
    const result = await f.registered.get("review_expert_plan")!.execute(request, f.exec) as { id: string };
    const run = await readReviewRun(result.id, f.stateDir);
    run.status = "running";
    run.steps.at(-1)!.status = "running";
    await saveReviewRun(run, f.stateDir);
    const read = await f.service.rpc("review/read", { id: run.id });
    expect(read).toMatchObject({ ok: true, value: { run: { status: "failed", error: expect.stringContaining("Host stopped") } } });
    const saved: ReviewRun = await readReviewRun(run.id, f.stateDir);
    expect(saved.steps[0]?.status).toBe("completed");
    expect(saved.steps.at(-1)?.status).toBe("cancelled");
  });

  it("returns structured errors for malformed RPC payloads", async () => {
    const f = await fixture();
    expect(await f.service.rpc("review/read", null)).toMatchObject({ ok: false });
    expect(await f.service.rpc("review/read", { id: "../private" })).toMatchObject({ ok: false });
    expect(await f.service.rpc("expert/catalog", { revision: "main" })).toMatchObject({ ok: false });
    expect(await f.service.rpc("review/cancel", { id: "missing" })).toMatchObject({ ok: false });
  });
});
