import z from "@deepseek-ai/schemastery";
import { installSettingsSection, settingsNamespace } from "@deepseek-ai/dsh-settings";
import { defineTool } from "@deepseek-ai/dsh-tools";
import { identityFor, initializeIdentities, reconcileIdentities } from "./identity.js";
import { DIGITAL_LIFE_CATEGORIES, DIGITAL_LIFE_NAMESPACE } from "../constants.js";
export const name = "digital-life";
export const inject = ["tools", "subagents", "agents", "connection"];
const ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const namespace = settingsNamespace(DIGITAL_LIFE_NAMESPACE);
const RecordSchema = z.object({
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
    enabled: z.boolean().default(true),
});
export const Config = z.object({
    provider: z.string().default("spawn"),
    maxBatchSize: z.natural().default(3),
    stateDir: z.string().required(false),
    records: z.array(RecordSchema).default([]),
});
function normalizeRecord(record) {
    const name = record.name.trim();
    const legacyTag = record.tag?.trim();
    const tags = record.tags.length > 0 ? record.tags : legacyTag === undefined || legacyTag === "" ? [] : [legacyTag];
    return {
        ...record,
        name,
        description: record.description.trim() || name,
        customCategory: record.category === "custom"
            ? record.customCategory?.trim() || name
            : record.customCategory?.trim() || undefined,
        tags,
    };
}
function normalizeRecords(records) {
    return records.map(normalizeRecord);
}
export function validateSettings(settings) {
    const ids = new Set();
    for (const rawRecord of settings.records ?? []) {
        const record = normalizeRecord(rawRecord);
        if (!ID_PATTERN.test(record.id))
            throw new Error(`digital-life: id "${record.id}" must match ${String(ID_PATTERN)}`);
        if (record.name.trim() === "")
            throw new Error(`digital-life: name is required for "${record.id}"`);
        if (record.description.trim() === "")
            throw new Error(`digital-life: description is required for "${record.id}"`);
        if (record.tags.some((tag) => tag.trim() === ""))
            throw new Error(`digital-life: tags cannot be empty for "${record.id}"`);
        if (record.category === "custom" && (record.customCategory?.trim() ?? "").length < 2)
            throw new Error(`digital-life: custom category requires a meaningful customCategory for "${record.id}"`);
        if (record.persona.trim() === "" && (record.agent?.trim() ?? "") === "")
            throw new Error(`digital-life: persona is required unless agent is set for "${record.id}"`);
        if (record.agent !== undefined && record.agent.trim() === "")
            throw new Error(`digital-life: agent cannot be empty for "${record.id}"`);
        if (ids.has(record.id))
            throw new Error(`digital-life: duplicate id "${record.id}"`);
        ids.add(record.id);
    }
    if ((settings.maxBatchSize ?? 3) < 1)
        throw new Error("digital-life: maxBatchSize must be positive");
}
function resolved(settings) {
    return {
        provider: settings.provider ?? "spawn",
        maxBatchSize: settings.maxBatchSize ?? 3,
        records: normalizeRecords(settings.records ?? []),
    };
}
function findRecord(settings, id) {
    const record = settings.records.find((item) => item.id === id);
    if (record === undefined)
        throw new Error(`digital-life: unknown digital life "${id}"`);
    if (!record.enabled)
        throw new Error(`digital-life: digital life "${id}" is disabled`);
    return record;
}
/** Ensure a digital-life session runs in the read-only file sandbox. */
function enforceReadOnlySandbox(session) {
    for (let index = session.events.length - 1; index >= 0; index -= 1) {
        const event = session.events[index];
        if (event?.type === "sandbox/mode") {
            if (event.data?.mode === "read-only")
                return;
            break;
        }
    }
    session.append("sandbox/mode", { mode: "read-only" });
}
/** Build the durable system prompt for a selected standalone digital life. */
export function independentSystemPromptFor(record, identity = record.persona) {
    return [
        `你是数字生命“${record.name}”。`,
        `你的主领域是“${record.category === "custom" ? record.customCategory || record.name : record.category}”。`,
        record.tags.length > 0 ? `你的能力标签是：${record.tags.join("、")}。` : "",
        `你的人格设定是：${identity}`,
        "",
        "这是一个独立的长期对话。你必须在整个会话中保持上述身份和人格，不要把自己描述成主 Agent、子代理或工具。",
        "你可以直接回答用户问题；不要复述这段系统设定，不要声称自己是真实人物。",
        "当信息不足时明确说明未知和假设；涉及建议时给出可执行的下一步。",
    ].join("\n");
}
// /btw
/** Build the one-shot consultation prompt for a digital life. */
export function promptFor(record, question, identity = record.persona) {
    return [
        {
            type: "text",
            text: [
                `你正在以数字生命“${record.name}”的身份回答一次咨询。`,
                `主领域：${record.category === "custom" ? record.customCategory || record.name : record.category}`,
                record.tags.length > 0 ? `能力标签：${record.tags.join("、")}` : "",
                `人格设定：${identity}`,
                "这是一条临时咨询：只回答本次问题，不假设与用户建立独立长期会话。区分事实、判断和推测；不要声称自己是真实人物；直接回答问题。",
                `用户问题：${question}`,
            ].join("\n\n"),
        },
    ];
}
function outputText(run, result) {
    const text = result.output
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("");
    if (text === "")
        throw new Error(`digital-life: ${String(run.id)} returned no text`);
    return text;
}
async function consult(ctx, record, question, exec, provider, stateDir) {
    if (exec.agent === undefined)
        throw new Error("digital-life consultation requires an agent-backed session");
    const available = ctx.subagents.getProvider(provider);
    if (available === undefined)
        throw new Error(`digital-life: subagent provider "${provider}" is unavailable`);
    if (!available.capabilities.persona)
        throw new Error(`digital-life: provider "${provider}" does not support persona`);
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
    }
    finally {
        await run.dispose();
    }
}
// register tools for consulting digital life and categories
function registerTools(ctx, current, stateDir) {
    // 1. specify a digital life to consult
    ctx.tools.register(defineTool({
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
                answer: await consult(ctx, record, args.question, exec, settings.provider, stateDir()),
            };
        },
    }));
    // 2. specify a digital life category to consult
    ctx.tools.register(defineTool({
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
            const answers = await Promise.all(records.map(async (record) => ({
                id: record.id,
                name: record.name,
                tags: record.tags,
                answer: await consult(ctx, record, args.question, exec, settings.provider, stateDir()),
            })));
            return {
                category: args.category,
                question: args.question,
                answers,
            };
        },
    }));
}
// inject digital life features into the host
export function apply(ctx, entry) {
    let source = () => entry;
    const stateDir = () => source().stateDir?.trim() || undefined;
    const connection = ctx.get("connection");
    ctx.effect(() => connection.rpc.handle("/digital-life", async (endpoint, payload) => {
        if (endpoint === "identity") {
            const input = payload;
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
        if (endpoint !== "bind")
            return {
                ok: false,
                error: {
                    code: "internal",
                    message: `unknown digital-life endpoint "${endpoint}"`,
                    details: {},
                },
            };
        const input = payload;
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
        const agent = ctx.agents.get(input.sessionId);
        if (agent === undefined)
            return {
                ok: false,
                error: {
                    code: "internal",
                    message: `unknown session "${input.sessionId}"`,
                    details: {},
                },
            };
        agent.ctx.systemPrompt.section({
            name: `digital-life:persona:${record.id}`,
            order: 1,
            text: independentSystemPromptFor(record, await identityFor(record, stateDir())),
        });
        enforceReadOnlySandbox(agent.session);
        return {
            ok: true,
            value: { sessionId: agent.id, recordId: record.id },
        };
    }, { authority: "trusted-host" }), "digital-life: session persona RPC");
    let persisted = entry.records ?? [];
    void initializeIdentities(persisted, stateDir()).catch((error) => {
        ctx.logger.error("digital-life: failed to initialize identities", error);
    });
    installSettingsSection(ctx, namespace, Config, entry, {
        setSource(current) {
            source = current;
        },
        validate: validateSettings,
        onChange() {
            const next = source().records ?? [];
            const previous = persisted;
            persisted = next;
            void reconcileIdentities(previous, next, stateDir()).catch((error) => {
                ctx.logger.error("digital-life: failed to persist identities", error);
            });
        },
    });
    registerTools(ctx, () => resolved(source()), stateDir);
}
