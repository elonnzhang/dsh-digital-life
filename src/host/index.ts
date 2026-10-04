import type { Context, Volatile } from "@deepseek-ai/cordis";
import type { Session, SessionId } from "@deepseek-ai/dsh-session";
import { setSandboxMode } from "@deepseek-ai/dsh-sandbox-policy";
import type { HostConnectionHandle } from "@deepseek-ai/dsh-client-connection";
import z from "@deepseek-ai/schemastery";
// Type-only: pulls the ctx.settings service merge (SettingsForms) into this program.
import type {} from "@deepseek-ai/dsh-settings";
// Type-only: pulls the ctx.systemPrompt service merge into this program.
import type {} from "@deepseek-ai/dsh-system-prompt";
// Type-only: pulls the 'loader/volatile-update' event into cordis Events.
import type {} from "@deepseek-ai/cordis-plugin-loader";
import { defineTool, type ToolExecution } from "@deepseek-ai/dsh-tools";
import { createAssistantMessage, type ContentBlock } from "@deepseek-ai/dsh-llm";
import { createProject, identityFor, initializeIdentities, reconcileIdentities } from "./identity.js";
import { deleteBinding, loadBinding, saveBinding, type DigitalLifeBinding } from "./session-binding.js";
import type { SubagentResult, SubagentRun } from "@deepseek-ai/dsh-subagent";
import type { Agent } from "@deepseek-ai/dsh-agent";
import { DIGITAL_LIFE_CATEGORIES } from "../constants.js";
import { createExpertService } from "./expert-service.js";
import { packageAgentBinding, validatePackageBinding } from "./expert-packages.js";
import type {
  DigitalLifeCategory,
  DigitalLifeRecord,
  DigitalLifeSettings,
  ResolvedDigitalLifeSettings,
} from "../types.js";

export const name = "digital-life";
export const inject = ["tools", "subagents", "agents", "connection", "sandboxPolicy"];

const ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

const RecordSchema: z<DigitalLifeRecord> = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().default(""),
  category: z.union([...DIGITAL_LIFE_CATEGORIES]),
  customCategory: z.string().required(false),
  tags: z.array(z.string()).default([]),
  tag: z.string().required(false),
  persona: z.string().default(""),
  agent: z.string().required(false),
  toolFilter: z.array(z.string()).required(false),
  model: z
    .object({
      provider: z.string().required(false),
      model: z.string().required(false),
    })
    .required(false),
  // z.object() defaults to `{}`, which would turn an absent binding into an
  // invalid one; the union with undefined keeps it absent.
  expertPackage: z.union([
    z.object({
      source: z.const("mimeographs"),
      slug: z.string(),
      revision: z.string(),
    }),
    z.const(undefined),
  ]).required(false),
  enabled: z.boolean().default(true),
});

/**
 * Live plugin config. Every editable field is `.volatile()` so a settings
 * write applies to the running fiber in place (no reload), and the Client
 * settings form can edit them. Access a field's current value with
 * `config.<field>.get()`.
 */
export interface Config {
  provider: Volatile<string>;
  maxBatchSize: Volatile<number>;
  stateDir: Volatile<string | undefined>;
  records: Volatile<DigitalLifeRecord[]>;
}

export const Config: z<DigitalLifeSettings, Config> = z.object({
  provider: z.string().default("spawn").volatile(),
  maxBatchSize: z.natural().default(3).volatile(),
  stateDir: z.string().required(false).volatile(),
  records: z.array(RecordSchema).default([]).volatile(),
});

function normalizeRecord(record: DigitalLifeRecord): DigitalLifeRecord {
  const name = record.name.trim();
  const legacyTag = record.tag?.trim();
  const tags = record.tags.length > 0 ? record.tags : legacyTag === undefined || legacyTag === "" ? [] : [legacyTag];
  return {
    ...record,
    name,
    description: record.description.trim() || name,
    ...(record.category === "custom"
      ? { customCategory: record.customCategory?.trim() || name }
      : record.customCategory?.trim()
        ? { customCategory: record.customCategory.trim() }
        : {}),
    tags,
  };
}

function normalizeRecords(records: readonly DigitalLifeRecord[]): DigitalLifeRecord[] {
  return records.map(normalizeRecord);
}

export function validateSettings(settings: DigitalLifeSettings): void {
  const ids = new Set<string>();
  for (const rawRecord of settings.records ?? []) {
    const record = normalizeRecord(rawRecord);
    if (!ID_PATTERN.test(record.id))
      throw new Error(`digital-life: id "${record.id}" must match ${String(ID_PATTERN)}`);
    if (record.name.trim() === "") throw new Error(`digital-life: name is required for "${record.id}"`);
    if (record.description.trim() === "") throw new Error(`digital-life: description is required for "${record.id}"`);
    if (record.tags.some((tag) => tag.trim() === ""))
      throw new Error(`digital-life: tags cannot be empty for "${record.id}"`);
    if (record.category === "custom" && (record.customCategory?.trim() ?? "").length < 2)
      throw new Error(`digital-life: custom category requires a meaningful customCategory for "${record.id}"`);
    if (record.persona.trim() === "" && (record.agent?.trim() ?? "") === "")
      throw new Error(`digital-life: persona is required unless agent is set for "${record.id}"`);
    if (record.agent !== undefined && record.agent.trim() === "")
      throw new Error(`digital-life: agent cannot be empty for "${record.id}"`);
    if (record.expertPackage !== undefined) {
      validatePackageBinding(record.expertPackage);
      if (record.agent !== packageAgentBinding(record.expertPackage))
        throw new Error("digital-life: imported expert identity must stay bound to its immutable package");
    }
    if (ids.has(record.id)) throw new Error(`digital-life: duplicate id "${record.id}"`);
    ids.add(record.id);
  }
  if ((settings.maxBatchSize ?? 3) < 1) throw new Error("digital-life: maxBatchSize must be positive");
}

function resolved(settings: DigitalLifeSettings): ResolvedDigitalLifeSettings {
  return {
    provider: settings.provider ?? "spawn",
    maxBatchSize: settings.maxBatchSize ?? 3,
    records: normalizeRecords(settings.records ?? []),
  };
}

function findRecord(settings: ResolvedDigitalLifeSettings, id: string): DigitalLifeRecord {
  const record = settings.records.find((item) => item.id === id);
  if (record === undefined) throw new Error(`digital-life: unknown digital life "${id}"`);
  if (!record.enabled) throw new Error(`digital-life: digital life "${id}" is disabled`);
  return record;
}

/** Ensure a digital-life session runs in the read-only file sandbox. */
function enforceReadOnlySandbox(session: Session): void {
  setSandboxMode(session, "read-only");
}

const DIGITAL_LIFE_MODE_PROMPT = [
  "你当前处于数字生命模式。",
  "请以当前会话选定的数字生命身份进行对话；具体身份、人格、领域和能力标签以数字生命身份提示词为准。",
  "保持该身份稳定，不要自行切换为其他数字生命，也不要把自己描述成主 Agent、子代理或工具。",
].join("\n");

const OPENING_MESSAGE_SOURCE = { provider: "digital-life", model: "opening" } as const;

/** Append the local opening message without entering the agent loop. */
export function appendOpeningAssistantMessage(session: Session, text: string): void {
  const alreadyAppended = session.snapshotEvents().some(
    (event) =>
      event.type === "assistant/message" &&
      event.data.message.source.provider === OPENING_MESSAGE_SOURCE.provider &&
      event.data.message.source.model === OPENING_MESSAGE_SOURCE.model,
  );
  if (alreadyAppended) return;
  if (session.deriveMessages().length > 0)
    throw new Error("digital-life: opening greeting requires a session without messages");

  const message = createAssistantMessage({
    content: [{ type: "text", text }],
    source: OPENING_MESSAGE_SOURCE,
  });
  session.append("turn/start", { turn: 0 });
  session.append("step/start", { turn: 0, step: 1 });
  session.append(
    "assistant/message",
    { turn: 0, step: 1, message, stream: [] },
    { surfaceOp: "append" },
  );
  session.append("step/end", { turn: 0, step: 1 });
  session.append("turn/end", { turn: 0, reason: { kind: "completed" } });
}

/** Build the durable system prompt for a selected standalone digital life. */
export function independentSystemPromptFor(record: DigitalLifeRecord, identity: string = record.persona): string {
  return [
    `你是数字生命“${record.name}”。`,
    `你的主领域是“${record.category === "custom" ? record.customCategory || record.name : record.category}”。`,
    record.tags.length > 0 ? `你的能力标签是：${record.tags.join("、")}。` : "",
    `你的人格设定是：${identity}`,
    referenceInstructionsFor(record),
    "",
    "这是一个独立的长期对话。你必须在整个会话中保持上述身份和人格，不要把自己描述成主 Agent、子代理或工具。",
    "你可以直接回答用户问题；不要复述这段系统设定，不要声称自己是真实人物。",
    `当用户使用 @<数字生命ID> 点名其他数字生命（不是 @${record.id}）时，必须调用 consult_digital_life，并将被点名的 ID 和用户问题原样传入；不得自行模拟或代替对方回答。`,
    `当用户点名 @${record.id} 时，直接以当前身份回答，不要调用 consult_digital_life 咨询自己。`,
    "当用户要求咨询某个数字生命类别时，调用 consult_digital_life_category，并忠实呈现各自观点。",
    "当信息不足时明确说明未知和假设；涉及建议时给出可执行的下一步。",
  ].join("\n");
}

function referenceInstructionsFor(record: DigitalLifeRecord): string {
  return record.expertPackage === undefined ? "" : [
    `你使用的是公开资料生成的方法助手，不代表人物本人或其授权。方法包版本：${record.expertPackage.revision}。`,
    `需要参考资料时调用 read_expert_reference，id 为 ${record.id}，省略 path 可列出文件。`,
    "引用应指向实际读取的内容；方法包中列出的外部链接未经本次检索验证。",
  ].join("\n");
}

/** Build the one-shot consultation prompt for a digital life. */
export function promptFor(
  record: DigitalLifeRecord,
  question: string,
  identity: string = record.persona,
): ContentBlock[] {
  return [
    {
      type: "text",
      text: [
        `你正在以数字生命“${record.name}”的身份回答一次咨询。`,
        `主领域：${record.category === "custom" ? record.customCategory || record.name : record.category}`,
        record.tags.length > 0 ? `能力标签：${record.tags.join("、")}` : "",
        `人格设定：${identity}`,
        referenceInstructionsFor(record),
        "这是一条临时咨询：只回答本次问题，不假设与用户建立独立长期会话。区分事实、判断和推测；不要声称自己是真实人物；直接回答问题。",
        `用户问题：${question}`,
      ].join("\n\n"),
    },
  ];
}

function outputText(run: SubagentRun, result: SubagentResult): string {
  const text = result.output
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
  if (text === "") throw new Error(`digital-life: ${String(run.id)} returned no text`);
  return text;
}

async function consult(
  ctx: Context,
  record: DigitalLifeRecord,
  question: string,
  exec: ToolExecution,
  provider: string,
  stateDir?: string,
): Promise<string> {
  if (exec.agent === undefined) throw new Error("digital-life consultation requires an agent-backed session");
  const available = ctx.subagents.getProvider(provider);
  if (available === undefined) throw new Error(`digital-life: subagent provider "${provider}" is unavailable`);
  if (!available.capabilities.persona) throw new Error(`digital-life: provider "${provider}" does not support persona`);
  if (record.toolFilter !== undefined && !available.capabilities.toolFilter) {
    throw new Error(`digital-life: provider "${provider}" does not support toolFilter`);
  }
  const identity = await identityFor(record, stateDir);
  const run = await ctx.subagents.start(provider, {
    label: `数字生命：${record.name}`,
    prompt: promptFor(record, question, identity),
    parent: exec.agent,
    signal: exec.signal,
    persona: identity,
    ...(record.toolFilter === undefined ? {} : { toolFilter: { allow: record.toolFilter } }),
    ...(record.model === undefined ? {} : { agentOptions: record.model }),
  });
  try {
    const result = await run.result;
    if (result.stopReason !== "completed") {
      throw new Error(`digital-life: consultation with "${record.name}" ended with ${result.stopReason}`);
    }
    return outputText(run, result);
  } finally {
    await run.dispose();
  }
}

// register tools for consulting digital life and categories
function registerTools(
  ctx: Context,
  current: () => ResolvedDigitalLifeSettings,
  stateDir: () => string | undefined,
  registerExpertTools: (agent: Pick<Agent, "ctx">) => () => void,
): () => void {
  const registerFor = (target: Pick<Agent, "ctx">): (() => void) => {
    const localDisposers: Array<() => void> = [registerExpertTools(target)];
    // 1. specify a digital life to consult
    localDisposers.push(
      target.ctx.tools.register(
        defineTool({
          name: "consult_digital_life",
          description: "向一个指定的数字生命咨询问题。使用数字生命 ID；不要选择 provider 或传输方式。",
          parameters: {
            id: {
              type: "string",
              required: true,
              description: "数字生命 ID，例如 zhang-xx。",
            },
            question: {
              type: "string",
              required: true,
              description: "需要该数字生命独立回答的问题。",
            },
          },
          output: {
            schema: {
              type: "object",
              properties: {
                id: { type: "string", required: true },
                name: { type: "string", required: true },
                tags: { type: "array", items: { type: "string" }, required: true },
                answer: { type: "string", required: true },
              },
              additionalProperties: false,
            },
            render: (_args, value) => [
              {
                type: "text",
                text: `${value.name}${value.tags.length > 0 ? `（${value.tags.join("、")}）` : ""}：\n${value.answer}`,
              },
            ],
          },
          async execute(args, exec) {
            const settings = current();
            const record = findRecord(settings, args.id);
            return {
              id: record.id,
              name: record.name,
              tags: record.tags,
              answer: await consult(exec.agent?.ctx ?? target.ctx, record, args.question, exec, settings.provider, stateDir()),
            };
          },
        }),
      ),
    );
    // 2. specify a digital life category to consult
    localDisposers.push(
      target.ctx.tools.register(
        defineTool({
          name: "consult_digital_life_category",
          description: "分别咨询一个类别中的数字生命，并返回各自观点供主代理比较和总结",
          parameters: {
            category: {
              type: "string",
              required: true,
              enum: [...DIGITAL_LIFE_CATEGORIES],
              description: "要咨询的数字生命类别",
            },
            question: {
              type: "string",
              required: true,
              description: "需要每位数字生命独立回答的问题",
            },
          },
          output: {
            schema: { type: "json" },
            render: (_args, value) => [{ type: "text", text: JSON.stringify(value, null, 2) }],
          },
          async execute(args, exec) {
            const settings = current();
            const records = settings.records
              .filter((record) => record.enabled && record.category === args.category)
              .slice(0, settings.maxBatchSize);
            if (records.length === 0)
              throw new Error(`digital-life: no enabled records in category "${args.category}"`);
            const results = await Promise.allSettled(
              records.map(async (record) => ({
                id: record.id,
                name: record.name,
                tags: record.tags,
                answer: await consult(exec.agent?.ctx ?? target.ctx, record, args.question, exec, settings.provider, stateDir()),
              })),
            );
            return {
              category: args.category as DigitalLifeCategory,
              question: args.question,
              answers: results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []),
              errors: results.flatMap((result, index) => result.status === "rejected" ? [{
                id: records[index]!.id,
                error: result.reason instanceof Error ? result.reason.message : String(result.reason),
              }] : []),
            };
          },
        }),
      ),
    );
    return () => {
      for (const dispose of localDisposers) dispose();
    };
  };
  // Register on the inherited Host plane so delegated tool restrictions also constrain these tools.
  return registerFor({ ctx });
}

// inject digital life features into the host
export function apply(ctx: Context, config: Config): void {
  const modeDisposers = new WeakMap<Agent, () => void>();
  const personaDisposers = new WeakMap<Agent, () => void>();
  const bindAgent = (agent: Agent, binding: DigitalLifeBinding): void => {
    if (!modeDisposers.has(agent)) {
      modeDisposers.set(agent, agent.ctx.systemPrompt.section({
        name: "digital-life:source",
        order: 1,
        text: DIGITAL_LIFE_MODE_PROMPT,
      }));
    }
    personaDisposers.get(agent)?.();
    personaDisposers.set(agent, agent.ctx.systemPrompt.section({
      name: "digital-life:persona",
      order: 2,
      text: binding.prompt,
    }));
    enforceReadOnlySandbox(agent.session);
  };
  const unbindAgent = async (agent: Agent): Promise<void> => {
    await deleteBinding(agent.id, stateDir());
    personaDisposers.get(agent)?.();
    personaDisposers.delete(agent);
    modeDisposers.get(agent)?.();
    modeDisposers.delete(agent);
    setSandboxMode(agent.session, ctx.sandboxPolicy.defaultMode);
  };
  ctx.on("agent/created", async ({ agent }) => {
    const binding = await loadBinding(agent.id, stateDir());
    if (binding !== undefined) bindAgent(agent, binding);
    return undefined;
  });
  // Reactive live read of the current settings from the fiber's volatile refs.
  const source = (): DigitalLifeSettings => {
    const stateDirValue = config.stateDir.get();
    return {
      provider: config.provider.get(),
      maxBatchSize: config.maxBatchSize.get(),
      ...(stateDirValue === undefined ? {} : { stateDir: stateDirValue }),
      records: config.records.get() as DigitalLifeRecord[],
    };
  };
  const stateDir = (): string | undefined => source().stateDir?.trim() || undefined;
  const expertService = createExpertService({ current: () => resolved(source()), stateDir });
  ctx.effect(() => () => expertService.dispose(), "digital-life: expert service lifecycle");
  // Preferences edited through Settings apply to the running fiber in place;
  // opt out of an auto-generated page (the plugin ships its own settings.section).
  ctx.inject(["settings"], (child) => {
    child.effect(() => child.settings.configure({ auto: false }, ctx.fiber));
  });
  const connection = ctx.get("connection") as HostConnectionHandle;
  ctx.effect(
    () =>
      connection.rpc.handle(
        "/digital-life",
        async (endpoint, payload) => {
          if (endpoint.startsWith("expert/") || endpoint.startsWith("review/"))
            return expertService.rpc(endpoint, payload);
          if (endpoint === "project") {
            return { ok: true, value: { cwd: await createProject(stateDir()) } };
          }
          if (endpoint === "greeting") {
            const input = payload as { sessionId?: string; text?: string };
            if (input.sessionId === undefined || input.text === undefined) {
              return {
                ok: false,
                error: {
                  code: "internal",
                  message: "sessionId and text are required",
                  details: {},
                },
              };
            }
            const agent = ctx.agents.get(input.sessionId as SessionId);
            if (agent === undefined)
              return {
                ok: false,
                error: {
                  code: "internal",
                  message: `unknown session "${input.sessionId}"`,
                  details: {},
                },
              };
            appendOpeningAssistantMessage(agent.session, input.text);
            return { ok: true, value: { sessionId: agent.id } };
          }
          if (endpoint === "identity") {
            const input = payload as { recordId?: string };
            if (input.recordId === undefined)
              return {
                ok: false,
                error: { code: "internal", message: "recordId is required", details: {} },
              };
            const record = findRecord(resolved(source()), input.recordId);
            return {
              ok: true,
              value: { recordId: record.id, identity: await identityFor(record, stateDir()) },
            };
          }
          if (endpoint === "binding") {
            const input = payload as { sessionId?: string };
            if (input.sessionId === undefined)
              return {
                ok: false,
                error: { code: "internal", message: "sessionId is required", details: {} },
              };
            const binding = await loadBinding(input.sessionId, stateDir());
            return {
              ok: true,
              value: binding === undefined ? undefined : { recordId: binding.recordId },
            };
          }
          if (endpoint === "unbind") {
            const input = payload as { sessionId?: string };
            if (input.sessionId === undefined)
              return {
                ok: false,
                error: { code: "internal", message: "sessionId is required", details: {} },
              };
            const agent = ctx.agents.get(input.sessionId as SessionId);
            if (agent !== undefined) await unbindAgent(agent);
            else await deleteBinding(input.sessionId, stateDir());
            return { ok: true, value: { sessionId: input.sessionId } };
          }
          if (endpoint !== "bind")
            return {
              ok: false,
              error: {
                code: "internal",
                message: `unknown digital-life endpoint "${endpoint}"`,
                details: {},
              },
            };
          const input = payload as { sessionId?: string; recordId?: string };
          if (input.sessionId === undefined || input.recordId === undefined) {
            return {
              ok: false,
              error: {
                code: "internal",
                message: "sessionId and recordId are required",
                details: {},
              },
            };
          }
          const record = findRecord(resolved(source()), input.recordId);
          const agent = ctx.agents.get(input.sessionId as SessionId);
          if (agent === undefined)
            return {
              ok: false,
              error: {
                code: "internal",
                message: `unknown session "${input.sessionId}"`,
                details: {},
              },
            };
          const binding = {
            recordId: record.id,
            prompt: independentSystemPromptFor(record, await identityFor(record, stateDir())),
          };
          await saveBinding(agent.id, binding, stateDir());
          bindAgent(agent, binding);
          return {
            ok: true,
            value: { sessionId: agent.id, recordId: record.id },
          };
        },
      ),
    "digital-life: session persona RPC",
  );
  // Validate the live configuration on load and reject a bad settings write
  // before it commits (mirrors the previous installSettingsSection.validate).
  ctx.on(
    "internal/config",
    function (this: import("@deepseek-ai/cordis").Fiber, _raw, next) {
      const raw: unknown = next();
      if (this !== ctx.fiber) return raw;
      validateSettings(raw as DigitalLifeSettings);
      return raw;
    },
  );
  validateSettings(source());
  let persisted = source().records ?? [];
  void initializeIdentities(persisted, stateDir()).catch((error) => {
    ctx.logger.error("digital-life: failed to initialize identities", error);
  });
  // Reconcile identity files when the volatile `records` field changes in place.
  ctx.on("loader/volatile-update", () => {
    const next = source().records ?? [];
    const previous = persisted;
    persisted = next;
    void reconcileIdentities(previous, next, stateDir()).catch((error) => {
      ctx.logger.error("digital-life: failed to persist identities", error);
    });
  });
  ctx.effect(() => registerTools(ctx, () => resolved(source()), stateDir, expertService.registerTools));
}
