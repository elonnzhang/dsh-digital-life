import { setSandboxMode } from "@deepseek-ai/dsh-sandbox-policy";
import z from "@deepseek-ai/schemastery";
import { defineTool } from "@deepseek-ai/dsh-tools";
import { createAssistantMessage } from "@deepseek-ai/dsh-llm";
import { mkdir, readFile, rename, rm, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { randomUUID } from "node:crypto";
//#region src/host/identity.ts
const MAX_IDENTITY_BYTES = 1048576;
/** Resolve the per-digital-life storage root. */
function digitalLifeHome(env = process.env, stateDir) {
	const configured = stateDir?.trim() || env.DSH_HOME?.trim();
	if (configured === void 0 || configured === "") return join(homedir(), ".dsh", "digital-life");
	const expanded = configured === "~" ? homedir() : configured.startsWith("~/") || configured.startsWith("~\\") ? join(homedir(), configured.slice(2)) : configured;
	const root = resolve(expanded);
	return root.endsWith(`${sep}digital-life`) ? root : join(root, "digital-life");
}
/** Create an empty working directory for a standalone Chat session. */
async function createProject(stateDir) {
	const projects = join(digitalLifeHome(process.env, stateDir), "projects");
	await mkdir(projects, {
		recursive: true,
		mode: 448
	});
	const stamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
	for (let suffix = 0; suffix < 100; suffix += 1) {
		const name = suffix === 0 ? stamp : `${stamp}-${String(suffix)}`;
		const path = join(projects, name);
		try {
			await mkdir(path, { mode: 448 });
			return path;
		} catch (error) {
			if (error.code !== "EEXIST") throw error;
		}
	}
	throw new Error("digital-life: unable to allocate a project directory");
}
/** WorkBuddy-compatible canonical agent location. */
function agentPath(id, stateDir) {
	return join(digitalLifeHome(process.env, stateDir), id, "agents", `${id}.md`);
}
/**
* Return the portable path stored for a managed identity.
* @param id Digital-life record ID.
* @returns A path relative to the configured digital-life state directory.
*/
function managedAgentBinding(id) {
	return `${id}/agents/${id}.md`;
}
function legacyAgentsPath(id, stateDir) {
	return join(digitalLifeHome(process.env, stateDir), id, "AGENTS.md");
}
function expandAgentPath(value, stateDir) {
	if (value === "~") return homedir();
	if (value.startsWith("~/") || value.startsWith("~\\")) return join(homedir(), value.slice(2));
	return value.startsWith("/") ? resolve(value) : resolve(digitalLifeHome(process.env, stateDir), value);
}
/** Agent files may carry YAML frontmatter; only the Markdown body is identity. */
function agentIdentity(markdown) {
	const normalized = markdown.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
	if (!normalized.startsWith("---\n")) return normalized.trim();
	const end = normalized.indexOf("\n---\n", 4);
	return (end === -1 ? normalized : normalized.slice(end + 5)).trim();
}
function yamlString(value) {
	return JSON.stringify(value);
}
/** Render a Claude/WorkBuddy-compatible agent file. */
function agentDocument(record, identity) {
	const lines = [
		"---",
		`name: ${yamlString(record.id)}`,
		`description: ${yamlString(record.description || record.name)}`
	];
	if (record.toolFilter !== void 0) lines.push(`tools: ${yamlString(record.toolFilter.join(", "))}`);
	lines.push(`model: ${yamlString(record.model?.model ?? "inherit")}`, "---", "", identity.trim());
	return `${lines.join("\n")}\n`;
}
async function readIdentityFile(path) {
	const value = await readFile(path, { encoding: "utf8" });
	if (Buffer.byteLength(value) > MAX_IDENTITY_BYTES) throw new Error(`identity file exceeds ${String(MAX_IDENTITY_BYTES)} bytes`);
	const identity = agentIdentity(value);
	if (identity === "") throw new Error("identity file is empty");
	return identity;
}
/**
* Read an Agent Markdown identity from an absolute, home-relative, or state-relative path.
* @param path Agent file path stored in settings.
* @param stateDir Optional digital-life state directory for relative paths.
* @returns The Markdown body without YAML frontmatter.
*/
async function readAgentIdentity(path, stateDir) {
	try {
		return await readIdentityFile(expandAgentPath(path, stateDir));
	} catch (error) {
		throw new Error(`digital-life: cannot load agent "${path}": ${String(error)}`);
	}
}
/** Read the canonical persisted expert identity. */
async function identityFor(record, stateDir) {
	if (record.agent !== void 0) return readAgentIdentity(record.agent, stateDir);
	try {
		return await readIdentityFile(agentPath(record.id, stateDir));
	} catch (error) {
		if (error.code !== "ENOENT") throw error;
	}
	if (record.persona.trim() !== "") return record.persona.trim();
	throw new Error(`digital-life: no identity configured for "${record.id}"`);
}
async function persist(record, stateDir, mode = "create") {
	const binding = record.agent?.trim();
	if (!(binding === void 0 || binding === managedAgentBinding(record.id))) {
		await readAgentIdentity(binding, stateDir);
		return;
	}
	const { agent: _agent, ...withoutAgent } = record;
	const identity = mode === "update" ? record.persona.trim() || await identityFor(withoutAgent, stateDir) : record.persona.trim();
	if (identity === "") throw new Error(`digital-life: no identity configured for "${record.id}"`);
	const path = agentPath(record.id, stateDir);
	await mkdir(dirname(path), {
		recursive: true,
		mode: 448
	});
	await writeFile(path, agentDocument(record, identity), {
		encoding: "utf8",
		mode: 384
	});
}
/** Ensure every managed life owns agents/<id>.md and migrate the old AGENTS.md layout. */
async function initializeIdentities(records, stateDir) {
	await Promise.all(records.map(async (record) => {
		if (record.agent !== void 0 && record.agent !== managedAgentBinding(record.id)) {
			await readAgentIdentity(record.agent, stateDir);
			return;
		}
		try {
			await readFile(agentPath(record.id, stateDir));
		} catch (error) {
			if (error.code !== "ENOENT") throw error;
			try {
				const legacy = await readIdentityFile(legacyAgentsPath(record.id, stateDir));
				const path = agentPath(record.id, stateDir);
				await mkdir(dirname(path), {
					recursive: true,
					mode: 448
				});
				await writeFile(path, agentDocument(record, legacy), {
					encoding: "utf8",
					mode: 384
				});
				await rm(legacyAgentsPath(record.id, stateDir), { force: true });
			} catch (legacyError) {
				if (legacyError.code !== "ENOENT") throw legacyError;
				await persist(record, stateDir);
			}
		}
	}));
}
/** Persist identity/metadata edits and remove storage for deleted records. */
async function reconcileIdentities(previous, next, stateDir) {
	const old = new Map(previous.map((record) => [record.id, record]));
	const ids = new Set(next.map((record) => record.id));
	await Promise.all([...next.map(async (record) => {
		const before = old.get(record.id);
		if (before === void 0) await persist(record, stateDir, "create");
		else if (JSON.stringify(before) !== JSON.stringify(record)) await persist(record, stateDir, "update");
	}), ...previous.filter((record) => !ids.has(record.id)).map((record) => rm(join(digitalLifeHome(process.env, stateDir), record.id), {
		recursive: true,
		force: true
	}))]);
}
//#endregion
//#region src/host/session-binding.ts
function bindingPath(sessionId, stateDir) {
	if (!/^session-[a-z0-9-]+$/.test(sessionId)) throw new Error(`digital-life: invalid session id "${sessionId}"`);
	return join(digitalLifeHome(process.env, stateDir), "sessions", `${sessionId}.json`);
}
async function loadBinding(sessionId, stateDir) {
	let content;
	try {
		content = await readFile(bindingPath(sessionId, stateDir), "utf8");
	} catch (error) {
		if (error.code === "ENOENT") return void 0;
		throw error;
	}
	const value = JSON.parse(content);
	if (typeof value !== "object" || value === null || typeof value.recordId !== "string" || typeof value.prompt !== "string") throw new Error(`digital-life: invalid binding for session "${sessionId}"`);
	return value;
}
async function saveBinding(sessionId, binding, stateDir) {
	const path = bindingPath(sessionId, stateDir);
	await mkdir(join(digitalLifeHome(process.env, stateDir), "sessions"), { recursive: true });
	const temporary = `${path}.${randomUUID()}.tmp`;
	await writeFile(temporary, JSON.stringify(binding), {
		flag: "wx",
		mode: 384
	});
	try {
		await rename(temporary, path);
	} catch (error) {
		await rm(temporary, { force: true });
		throw error;
	}
}
async function deleteBinding(sessionId, stateDir) {
	try {
		await unlink(bindingPath(sessionId, stateDir));
	} catch (error) {
		if (error.code !== "ENOENT") throw error;
	}
}
//#endregion
//#region src/constants.ts
const DIGITAL_LIFE_NAMESPACE = "digital-life";
const DIGITAL_LIFE_CATEGORIES = [
	"business",
	"science",
	"culture",
	"tech",
	"entertainment",
	"custom"
];
//#endregion
//#region src/host/index.ts
const name = "digital-life";
const inject = [
	"tools",
	"subagents",
	"agents",
	"connection",
	"sandboxPolicy"
];
const ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
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
	model: z.object({
		provider: z.string().required(false),
		model: z.string().required(false)
	}).required(false),
	enabled: z.boolean().default(true)
});
const Config = z.object({
	provider: z.string().default("spawn").volatile(),
	maxBatchSize: z.natural().default(3).volatile(),
	stateDir: z.string().required(false).volatile(),
	records: z.array(RecordSchema).default([]).volatile()
});
function normalizeRecord(record) {
	const name = record.name.trim();
	const legacyTag = record.tag?.trim();
	const tags = record.tags.length > 0 ? record.tags : legacyTag === void 0 || legacyTag === "" ? [] : [legacyTag];
	return {
		...record,
		name,
		description: record.description.trim() || name,
		...record.category === "custom" ? { customCategory: record.customCategory?.trim() || name } : record.customCategory?.trim() ? { customCategory: record.customCategory.trim() } : {},
		tags
	};
}
function normalizeRecords(records) {
	return records.map(normalizeRecord);
}
function validateSettings(settings) {
	const ids = /* @__PURE__ */ new Set();
	for (const rawRecord of settings.records ?? []) {
		const record = normalizeRecord(rawRecord);
		if (!ID_PATTERN.test(record.id)) throw new Error(`digital-life: id "${record.id}" must match ${String(ID_PATTERN)}`);
		if (record.name.trim() === "") throw new Error(`digital-life: name is required for "${record.id}"`);
		if (record.description.trim() === "") throw new Error(`digital-life: description is required for "${record.id}"`);
		if (record.tags.some((tag) => tag.trim() === "")) throw new Error(`digital-life: tags cannot be empty for "${record.id}"`);
		if (record.category === "custom" && (record.customCategory?.trim() ?? "").length < 2) throw new Error(`digital-life: custom category requires a meaningful customCategory for "${record.id}"`);
		if (record.persona.trim() === "" && (record.agent?.trim() ?? "") === "") throw new Error(`digital-life: persona is required unless agent is set for "${record.id}"`);
		if (record.agent !== void 0 && record.agent.trim() === "") throw new Error(`digital-life: agent cannot be empty for "${record.id}"`);
		if (ids.has(record.id)) throw new Error(`digital-life: duplicate id "${record.id}"`);
		ids.add(record.id);
	}
	if ((settings.maxBatchSize ?? 3) < 1) throw new Error("digital-life: maxBatchSize must be positive");
}
function resolved(settings) {
	return {
		provider: settings.provider ?? "spawn",
		maxBatchSize: settings.maxBatchSize ?? 3,
		records: normalizeRecords(settings.records ?? [])
	};
}
function findRecord(settings, id) {
	const record = settings.records.find((item) => item.id === id);
	if (record === void 0) throw new Error(`digital-life: unknown digital life "${id}"`);
	if (!record.enabled) throw new Error(`digital-life: digital life "${id}" is disabled`);
	return record;
}
/** Ensure a digital-life session runs in the read-only file sandbox. */
function enforceReadOnlySandbox(session) {
	setSandboxMode(session, "read-only");
}
const DIGITAL_LIFE_MODE_PROMPT = [
	"你当前处于数字生命模式。",
	"请以当前会话选定的数字生命身份进行对话；具体身份、人格、领域和能力标签以数字生命身份提示词为准。",
	"保持该身份稳定，不要自行切换为其他数字生命，也不要把自己描述成主 Agent、子代理或工具。"
].join("\n");
const OPENING_MESSAGE_SOURCE = {
	provider: "digital-life",
	model: "opening"
};
/** Append the local opening message without entering the agent loop. */
function appendOpeningAssistantMessage(session, text) {
	if (session.snapshotEvents().some((event) => event.type === "assistant/message" && event.data.message.source.provider === OPENING_MESSAGE_SOURCE.provider && event.data.message.source.model === OPENING_MESSAGE_SOURCE.model)) return;
	if (session.deriveMessages().length > 0) throw new Error("digital-life: opening greeting requires a session without messages");
	const message = createAssistantMessage({
		content: [{
			type: "text",
			text
		}],
		source: OPENING_MESSAGE_SOURCE
	});
	session.append("turn/start", { turn: 0 });
	session.append("step/start", {
		turn: 0,
		step: 1
	});
	session.append("assistant/message", {
		turn: 0,
		step: 1,
		message,
		stream: []
	}, { surfaceOp: "append" });
	session.append("step/end", {
		turn: 0,
		step: 1
	});
	session.append("turn/end", {
		turn: 0,
		reason: { kind: "completed" }
	});
}
/** Build the durable system prompt for a selected standalone digital life. */
function independentSystemPromptFor(record, identity = record.persona) {
	return [
		`你是数字生命“${record.name}”。`,
		`你的主领域是“${record.category === "custom" ? record.customCategory || record.name : record.category}”。`,
		record.tags.length > 0 ? `你的能力标签是：${record.tags.join("、")}。` : "",
		`你的人格设定是：${identity}`,
		"",
		"这是一个独立的长期对话。你必须在整个会话中保持上述身份和人格，不要把自己描述成主 Agent、子代理或工具。",
		"你可以直接回答用户问题；不要复述这段系统设定，不要声称自己是真实人物。",
		`当用户使用 @<数字生命ID> 点名其他数字生命（不是 @${record.id}）时，必须调用 consult_digital_life，并将被点名的 ID 和用户问题原样传入；不得自行模拟或代替对方回答。`,
		`当用户点名 @${record.id} 时，直接以当前身份回答，不要调用 consult_digital_life 咨询自己。`,
		"当用户要求咨询某个数字生命类别时，调用 consult_digital_life_category，并忠实呈现各自观点。",
		"当信息不足时明确说明未知和假设；涉及建议时给出可执行的下一步。"
	].join("\n");
}
/** Build the one-shot consultation prompt for a digital life. */
function promptFor(record, question, identity = record.persona) {
	return [{
		type: "text",
		text: [
			`你正在以数字生命“${record.name}”的身份回答一次咨询。`,
			`主领域：${record.category === "custom" ? record.customCategory || record.name : record.category}`,
			record.tags.length > 0 ? `能力标签：${record.tags.join("、")}` : "",
			`人格设定：${identity}`,
			"这是一条临时咨询：只回答本次问题，不假设与用户建立独立长期会话。区分事实、判断和推测；不要声称自己是真实人物；直接回答问题。",
			`用户问题：${question}`
		].join("\n\n")
	}];
}
function outputText(run, result) {
	const text = result.output.filter((block) => block.type === "text").map((block) => block.text).join("");
	if (text === "") throw new Error(`digital-life: ${String(run.id)} returned no text`);
	return text;
}
async function consult(ctx, record, question, exec, provider, stateDir) {
	if (exec.agent === void 0) throw new Error("digital-life consultation requires an agent-backed session");
	const available = ctx.subagents.getProvider(provider);
	if (available === void 0) throw new Error(`digital-life: subagent provider "${provider}" is unavailable`);
	if (!available.capabilities.persona) throw new Error(`digital-life: provider "${provider}" does not support persona`);
	if (record.toolFilter !== void 0 && !available.capabilities.toolFilter) throw new Error(`digital-life: provider "${provider}" does not support toolFilter`);
	const identity = await identityFor(record, stateDir);
	const run = await ctx.subagents.start(provider, {
		label: `数字生命：${record.name}`,
		prompt: promptFor(record, question, identity),
		parent: exec.agent,
		signal: exec.signal,
		persona: identity,
		...record.toolFilter === void 0 ? {} : { toolFilter: { allow: record.toolFilter } },
		...record.model === void 0 ? {} : { agentOptions: record.model }
	});
	try {
		const result = await run.result;
		if (result.stopReason !== "completed") throw new Error(`digital-life: consultation with "${record.name}" ended with ${result.stopReason}`);
		return outputText(run, result);
	} finally {
		await run.dispose();
	}
}
function registerTools(ctx, current, stateDir) {
	const disposers = /* @__PURE__ */ new Map();
	const registerFor = (target) => {
		const localDisposers = [];
		localDisposers.push(target.ctx.tools.register(defineTool({
			name: "consult_digital_life",
			description: "向一个指定的数字生命咨询问题。使用数字生命 ID；不要选择 provider 或传输方式。",
			parameters: {
				id: {
					type: "string",
					required: true,
					description: "数字生命 ID，例如 zhang-xx。"
				},
				question: {
					type: "string",
					required: true,
					description: "需要该数字生命独立回答的问题。"
				}
			},
			output: {
				schema: {
					type: "object",
					properties: {
						id: {
							type: "string",
							required: true
						},
						name: {
							type: "string",
							required: true
						},
						tags: {
							type: "array",
							items: { type: "string" },
							required: true
						},
						answer: {
							type: "string",
							required: true
						}
					},
					additionalProperties: false
				},
				render: (_args, value) => [{
					type: "text",
					text: `${value.name}${value.tags.length > 0 ? `（${value.tags.join("、")}）` : ""}：\n${value.answer}`
				}]
			},
			async execute(args, exec) {
				const settings = current();
				const record = findRecord(settings, args.id);
				return {
					id: record.id,
					name: record.name,
					tags: record.tags,
					answer: await consult(target.ctx, record, args.question, exec, settings.provider, stateDir())
				};
			}
		})));
		localDisposers.push(target.ctx.tools.register(defineTool({
			name: "consult_digital_life_category",
			description: "分别咨询一个类别中的数字生命，并返回各自观点供主代理比较和总结",
			parameters: {
				category: {
					type: "string",
					required: true,
					enum: [...DIGITAL_LIFE_CATEGORIES],
					description: "要咨询的数字生命类别"
				},
				question: {
					type: "string",
					required: true,
					description: "需要每位数字生命独立回答的问题"
				}
			},
			output: {
				schema: { type: "json" },
				render: (_args, value) => [{
					type: "text",
					text: JSON.stringify(value, null, 2)
				}]
			},
			async execute(args, exec) {
				const settings = current();
				const records = settings.records.filter((record) => record.enabled && record.category === args.category).slice(0, settings.maxBatchSize);
				if (records.length === 0) throw new Error(`digital-life: no enabled records in category "${args.category}"`);
				const answers = await Promise.all(records.map(async (record) => ({
					id: record.id,
					name: record.name,
					tags: record.tags,
					answer: await consult(target.ctx, record, args.question, exec, settings.provider, stateDir())
				})));
				return {
					category: args.category,
					question: args.question,
					answers
				};
			}
		})));
		return () => {
			for (const dispose of localDisposers) dispose();
		};
	};
	for (const agent of ctx.agents.list()) disposers.set(agent, registerFor(agent));
	ctx.on("agent/created", ({ agent }) => {
		disposers.set(agent, registerFor(agent));
	});
	ctx.on("agent/disposed", ({ agent }) => {
		disposers.get(agent)?.();
		disposers.delete(agent);
	});
	return () => {
		for (const dispose of disposers.values()) dispose();
		disposers.clear();
	};
}
function apply(ctx, config) {
	const modeDisposers = /* @__PURE__ */ new WeakMap();
	const personaDisposers = /* @__PURE__ */ new WeakMap();
	const bindAgent = (agent, binding) => {
		if (!modeDisposers.has(agent)) modeDisposers.set(agent, agent.ctx.systemPrompt.section({
			name: "digital-life:source",
			order: 1,
			text: DIGITAL_LIFE_MODE_PROMPT
		}));
		personaDisposers.get(agent)?.();
		personaDisposers.set(agent, agent.ctx.systemPrompt.section({
			name: "digital-life:persona",
			order: 2,
			text: binding.prompt
		}));
		enforceReadOnlySandbox(agent.session);
	};
	const unbindAgent = async (agent) => {
		await deleteBinding(agent.id, stateDir());
		personaDisposers.get(agent)?.();
		personaDisposers.delete(agent);
		modeDisposers.get(agent)?.();
		modeDisposers.delete(agent);
		setSandboxMode(agent.session, ctx.sandboxPolicy.defaultMode);
	};
	ctx.on("agent/created", async ({ agent }) => {
		const binding = await loadBinding(agent.id, stateDir());
		if (binding !== void 0) bindAgent(agent, binding);
	});
	const source = () => {
		const stateDirValue = config.stateDir.get();
		return {
			provider: config.provider.get(),
			maxBatchSize: config.maxBatchSize.get(),
			...stateDirValue === void 0 ? {} : { stateDir: stateDirValue },
			records: config.records.get()
		};
	};
	const stateDir = () => source().stateDir?.trim() || void 0;
	ctx.inject(["settings"], (child) => {
		child.effect(() => child.settings.configure({ auto: false }, ctx.fiber));
	});
	const connection = ctx.get("connection");
	ctx.effect(() => connection.rpc.handle("/digital-life", async (endpoint, payload) => {
		if (endpoint === "project") return {
			ok: true,
			value: { cwd: await createProject(stateDir()) }
		};
		if (endpoint === "greeting") {
			const input = payload;
			if (input.sessionId === void 0 || input.text === void 0) return {
				ok: false,
				error: {
					code: "internal",
					message: "sessionId and text are required",
					details: {}
				}
			};
			const agent = ctx.agents.get(input.sessionId);
			if (agent === void 0) return {
				ok: false,
				error: {
					code: "internal",
					message: `unknown session "${input.sessionId}"`,
					details: {}
				}
			};
			appendOpeningAssistantMessage(agent.session, input.text);
			return {
				ok: true,
				value: { sessionId: agent.id }
			};
		}
		if (endpoint === "identity") {
			const input = payload;
			if (input.recordId === void 0) return {
				ok: false,
				error: {
					code: "internal",
					message: "recordId is required",
					details: {}
				}
			};
			const record = findRecord(resolved(source()), input.recordId);
			return {
				ok: true,
				value: {
					recordId: record.id,
					identity: await identityFor(record, stateDir())
				}
			};
		}
		if (endpoint === "binding") {
			const input = payload;
			if (input.sessionId === void 0) return {
				ok: false,
				error: {
					code: "internal",
					message: "sessionId is required",
					details: {}
				}
			};
			const binding = await loadBinding(input.sessionId, stateDir());
			return {
				ok: true,
				value: binding === void 0 ? void 0 : { recordId: binding.recordId }
			};
		}
		if (endpoint === "unbind") {
			const input = payload;
			if (input.sessionId === void 0) return {
				ok: false,
				error: {
					code: "internal",
					message: "sessionId is required",
					details: {}
				}
			};
			const agent = ctx.agents.get(input.sessionId);
			if (agent !== void 0) await unbindAgent(agent);
			else await deleteBinding(input.sessionId, stateDir());
			return {
				ok: true,
				value: { sessionId: input.sessionId }
			};
		}
		if (endpoint !== "bind") return {
			ok: false,
			error: {
				code: "internal",
				message: `unknown digital-life endpoint "${endpoint}"`,
				details: {}
			}
		};
		const input = payload;
		if (input.sessionId === void 0 || input.recordId === void 0) return {
			ok: false,
			error: {
				code: "internal",
				message: "sessionId and recordId are required",
				details: {}
			}
		};
		const record = findRecord(resolved(source()), input.recordId);
		const agent = ctx.agents.get(input.sessionId);
		if (agent === void 0) return {
			ok: false,
			error: {
				code: "internal",
				message: `unknown session "${input.sessionId}"`,
				details: {}
			}
		};
		const binding = {
			recordId: record.id,
			prompt: independentSystemPromptFor(record, await identityFor(record, stateDir()))
		};
		await saveBinding(agent.id, binding, stateDir());
		bindAgent(agent, binding);
		return {
			ok: true,
			value: {
				sessionId: agent.id,
				recordId: record.id
			}
		};
	}), "digital-life: session persona RPC");
	ctx.on("internal/config", function(_raw, next) {
		const raw = next();
		if (this !== ctx.fiber) return raw;
		validateSettings(raw);
		return raw;
	});
	validateSettings(source());
	let persisted = source().records ?? [];
	initializeIdentities(persisted, stateDir()).catch((error) => {
		ctx.logger.error("digital-life: failed to initialize identities", error);
	});
	ctx.on("loader/volatile-update", () => {
		const next = source().records ?? [];
		const previous = persisted;
		persisted = next;
		reconcileIdentities(previous, next, stateDir()).catch((error) => {
			ctx.logger.error("digital-life: failed to persist identities", error);
		});
	});
	ctx.effect(() => registerTools(ctx, () => resolved(source()), stateDir));
}
//#endregion
export { Config, DIGITAL_LIFE_CATEGORIES, DIGITAL_LIFE_NAMESPACE, apply, independentSystemPromptFor, inject, name, promptFor, validateSettings };
