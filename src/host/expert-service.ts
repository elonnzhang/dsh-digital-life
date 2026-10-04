import type { Agent } from "@deepseek-ai/dsh-agent";
import { defineTool, type ToolExecution } from "@deepseek-ai/dsh-tools";
import type { DigitalLifeRecord, ResolvedDigitalLifeSettings } from "../types.js";
import type { ReviewRequest, ReviewRun } from "../expert-types.js";
import { MIMEOGRAPHS_REVISION } from "../expert-types.js";
import { digitalLifeHome } from "./identity.js";
import { importMimeograph, loadExpertCatalog, loadExpertPackage, readExpertReference, recordForPackage } from "./expert-packages.js";
import { listReviewRuns, readReviewRun, renderReviewMarkdown, REVIEW_OUTPUT_SCHEMA, runExpertReview, saveReviewRun, validateReviewRequest } from "./review.js";

interface Options {
  current: () => ResolvedDigitalLifeSettings;
  stateDir: () => string | undefined;
}

function object(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("digital-life: expected an object");
  return value as Record<string, unknown>;
}

function string(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`digital-life: ${label} is required`);
  return value;
}

export function createExpertService(options: Options) {
  const active = new Map<string, { controller: AbortController; home: string }>();
  const controllers = new Set<AbortController>();
  const recordFor = (id: string): DigitalLifeRecord => {
    const record = options.current().records.find((item) => item.id === id && item.enabled);
    if (record === undefined) throw new Error(`digital-life: enabled expert not found: ${id}`);
    return record;
  };
  const recover = async (run: ReviewRun, stateDir?: string): Promise<ReviewRun> => {
    if (run.status === "running" && !active.has(run.id)) {
      run.status = "failed";
      run.error = "Host stopped before this review finished. Start a new review to retry.";
      run.updatedAt = new Date().toISOString();
      for (const step of run.steps) if (step.status === "running" || step.status === "pending") step.status = "cancelled";
      await saveReviewRun(run, stateDir);
    }
    return run;
  };

  const review = async (request: ReviewRequest, exec: ToolExecution): Promise<ReviewRun> => {
    const parent = exec.agent;
    if (parent === undefined) throw new Error("digital-life: review requires an agent-backed session");
    const settings = options.current();
    validateReviewRequest(request, settings.records);
    const provider = parent.ctx.subagents.getProvider(settings.provider);
    if (!provider?.capabilities.persona || !provider.capabilities.toolFilter)
      throw new Error("digital-life: review provider must support persona and toolFilter");
    if (controllers.size >= 2) throw new Error("digital-life: two reviews are already running; wait or cancel one");
    const stateDir = options.stateDir();
    const controller = new AbortController();
    controllers.add(controller);
    let runId: string | undefined;
    try {
      return await runExpertReview({
        request,
        records: settings.records,
        sessionId: parent.id,
        signal: AbortSignal.any([exec.signal, controller.signal]),
        ...(stateDir === undefined ? {} : { stateDir }),
        onStart(id) {
          runId = id;
          active.set(id, { controller, home: digitalLifeHome(process.env, stateDir) });
        },
        async invoke({ record, identity, role, prompt, signal }) {
          signal.throwIfAborted();
          const child = await parent.ctx.subagents.start(settings.provider, {
            label: `${role}: ${record.name}`,
            parent,
            signal,
            persona: identity,
            prompt: [{ type: "text", text: prompt }],
            // Review evidence is supplied by the Host; stages cannot recursively delegate or take external actions.
            toolFilter: { allow: [] },
            ...(provider.capabilities.agentOptions ? { agentOptions: { ...record.model, maxTokens: 4096 } }
              : record.model === undefined ? {} : { agentOptions: record.model }),
            ...(provider.capabilities.outputSchema ? { outputSchema: REVIEW_OUTPUT_SCHEMA } : {}),
          });
          try {
            const result = await child.result;
            if (result.stopReason !== "completed") throw new Error(`Review stage ended with ${result.stopReason}`);
            if (result.structured !== undefined) return result.structured;
            const text = result.output.filter((block) => block.type === "text").map((block) => block.text).join("").trim();
            return JSON.parse(text);
          } finally {
            await child.dispose();
          }
        },
      });
    } finally {
      controllers.delete(controller);
      if (runId !== undefined) active.delete(runId);
    }
  };

  return {
    dispose() {
      for (const controller of controllers) controller.abort(new Error("Expert service stopped"));
    },
    registerTools(target: Pick<Agent, "ctx">): () => void {
      const disposers = [
        target.ctx.tools.register(defineTool({
          name: "read_expert_reference",
          description: "读取已导入专家包中的参考资料。省略 path 列出文件；只返回本地固定版本内容，不会访问资料中的外部链接。",
          parameters: {
            id: { type: "string", required: true, description: "已启用的专家 ID" },
            path: { type: "string", description: "如 references/frameworks.md；省略则列出可读文件" },
          },
          output: { schema: { type: "json" }, render: (_args, value) => [{ type: "text", text: JSON.stringify(value, null, 2) }] },
          async execute(args) {
            const record = recordFor(args.id);
            if (record.expertPackage === undefined) throw new Error("digital-life: expert has no imported package");
            const stateDir = options.stateDir();
            if (args.path === undefined) {
              const manifest = await loadExpertPackage(record.expertPackage, stateDir);
              return { id: record.id, revision: manifest.revision, files: manifest.files.filter((file) => file.path.startsWith("references/")) };
            }
            return { ...await readExpertReference(record, args.path, stateDir) };
          },
        })),
        target.ctx.tools.register(defineTool({
          name: "review_expert_plan",
          description: "运行固定的科研与技术方案评审：1-3 位专家独立分析，另一位审查并汇总。保留报告、方法引用与失败。一次最多五次子代理调用，五分钟超时。",
          parameters: {
            question: { type: "string", required: true, description: "完整方案、目标、资料和约束；最多20000字符" },
            expertIds: { type: "array", required: true, items: { type: "string" }, description: "1-3 位已启用分析专家 ID" },
            reviewerId: { type: "string", required: true, description: "与分析专家不同的审查专家 ID" },
          },
          output: {
            schema: { type: "object", additionalProperties: false, properties: { id: { type: "string", required: true }, status: { type: "string", required: true }, markdown: { type: "string", required: true } } },
            render: (_args, value) => [{ type: "text", text: value.markdown }],
          },
          async execute(args, exec) {
            const run = await review(args, exec);
            return { id: run.id, status: run.status, markdown: renderReviewMarkdown(run) };
          },
        })),
        target.ctx.tools.register(defineTool({
          name: "read_expert_review",
          description: "读取已保存的专家评审报告；可查看完整阶段与失败原因。",
          parameters: { id: { type: "string", required: true, description: "review- 开头的评审 ID" } },
          output: {
            schema: { type: "object", additionalProperties: false, properties: { id: { type: "string", required: true }, status: { type: "string", required: true }, markdown: { type: "string", required: true } } },
            render: (_args, value) => [{ type: "text", text: value.markdown }],
          },
          async execute(args) {
            const stateDir = options.stateDir();
            const run = await recover(await readReviewRun(args.id, stateDir), stateDir);
            return { id: run.id, status: run.status, markdown: renderReviewMarkdown(run) };
          },
        })),
      ];
      return () => { for (const dispose of disposers) dispose(); };
    },
    async rpc(endpoint: string, payload: unknown) {
      try {
        const input = object(payload);
        const stateDir = options.stateDir();
        let value: unknown;
        if (endpoint === "expert/catalog") {
          const revision = input.revision === undefined ? MIMEOGRAPHS_REVISION : string(input.revision, "revision");
          value = { revision, experts: await loadExpertCatalog(revision) };
        } else if (endpoint === "expert/import") {
          const revision = input.revision === undefined ? MIMEOGRAPHS_REVISION : string(input.revision, "revision");
          const manifest = await importMimeograph({ source: "mimeographs", slug: string(input.slug, "slug"), revision }, stateDir);
          value = { manifest, record: recordForPackage(manifest) };
        } else if (endpoint === "review/list") {
          const summaries = await listReviewRuns(stateDir);
          for (const summary of summaries) {
            if (summary.status === "running" && !active.has(summary.id)) {
              const run = await recover(await readReviewRun(summary.id, stateDir), stateDir);
              summary.status = run.status;
              summary.updatedAt = run.updatedAt;
            }
          }
          value = summaries;
        } else if (endpoint === "review/read") {
          const run = await recover(await readReviewRun(string(input.id, "id"), stateDir), stateDir);
          value = { run, markdown: renderReviewMarkdown(run) };
        } else if (endpoint === "review/cancel") {
          const job = active.get(string(input.id, "id"));
          if (job === undefined || job.home !== digitalLifeHome(process.env, stateDir)) throw new Error("digital-life: review is not running");
          job.controller.abort(new Error("Review cancelled by user"));
          value = { cancelled: true };
        } else throw new Error(`digital-life: unknown expert endpoint ${endpoint}`);
        return { ok: true as const, value };
      } catch (error) {
        return { ok: false as const, error: { code: "internal" as const, message: error instanceof Error ? error.message : String(error), details: {} } };
      }
    },
  };
}
