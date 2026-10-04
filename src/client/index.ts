import type { Context as ClientContext } from "@deepseek-ai/cordis";
import type { SessionId } from "@deepseek-ai/dsh-session/types";
import type { AgentPresetRow } from "@deepseek-ai/dsh-agent-preset-registry/types";
import type { ClientRemote } from "@deepseek-ai/dsh-api-remotes/client";
import type {
  InputTriggerServiceContract,
  InputTriggerSource,
} from "@deepseek-ai/dsh-client-ui-input-trigger/client";
// Type-only: pulls the ctx.slots service merge (SlotRegistry) into scope.
import type {} from "@deepseek-ai/dsh-client-ui-renderer/client";
// Type-only: pulls the ctx.configForms service merge (ConfigForms) into scope.
import type {} from "@deepseek-ai/dsh-client-ui-settings/client";
import type {} from "@deepseek-ai/dsh-client-ui-settings-plugins/client";
import type {} from "@deepseek-ai/dsh-client-ui-layout/client";
import type {} from "@deepseek-ai/dsh-client-ui-sidebar/client";
import type {} from "@deepseek-ai/dsh-client-locale/client";
// Type-only: pulls the ctx.sessions service merge (ISessions) into scope.
import type { ISessions } from "@deepseek-ai/dsh-api-session-controller/client";
// Type-only: pulls the ctx.uiWorkspace navigation service merge into scope.
import type {} from "@deepseek-ai/dsh-client-ui-workspace/client";
import type { TranslateNS } from "@deepseek-ai/dsh-client-ui-slots";
import type {
  ClientConnectionRpc,
  ConnectionHandle,
} from "@deepseek-ai/dsh-client-connection/client";
import { DIGITAL_LIFE_NAMESPACE } from "../constants.js";
import type { DigitalLifeRecord, DigitalLifeSettings } from "../types.js";
import {
  DigitalLifeSettingSection,
  type DigitalLifeSettingSectionInjected,
} from "./DigitalLifeSettingSection.js";
import { ChatPanel, type ChatPanelInjected } from "./ChatPanel.js";
import {
  installAgentPresetSelector,
  type PrepareDigitalLifeSession,
} from "./installAgentPresetSelector.js";
import { en, NS, zh, type DigitalLifeKey } from "./locales.js";
import { reviewSubmission, type ExpertWorkbenchApi } from "./ExpertWorkbench.js";
import type { ExpertCatalogEntry, ReviewRun, ReviewSummary } from "../expert-types.js";

declare module "@deepseek-ai/dsh-client-ui-slots" {
  interface LocaleNamespaceMap {
    "digital-life": DigitalLifeKey;
  }
}

declare module "@deepseek-ai/dsh-api-session-controller/client" {
  interface SessionReferenceSourceMap {
    /** A digital-life session retained while its opening greeting is written. */
    digitalLife: unknown;
  }
}

/** The Host plugin entry id whose settings this Client half edits. */
const DIGITAL_LIFE_ENTRY_ID = DIGITAL_LIFE_NAMESPACE;

export const inject = [
  "slots",
  "inputTriggers",
  "connection",
  "remote",
  "remote.agentPresets",
  "conversation",
  "configForms",
  "locale",
  "sessions",
  "uiWorkspace",
];

export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), "digital-life: dictionaries");
  const t = ctx.locale.bind(NS);
  const form = ctx.configForms.get<DigitalLifeSettings>(DIGITAL_LIFE_ENTRY_ID);
  const callExpert = async <T,>(endpoint: string, payload: unknown): Promise<T> => {
    const connection = ctx.get("connection") as ConnectionHandle | undefined;
    if (connection === undefined) throw new Error("digital-life: connection service is unavailable");
    const result = await (connection.rpc as unknown as ClientConnectionRpc).call("/digital-life", endpoint, payload);
    if (!result.ok) throw new Error(result.error.message);
    return result.value as T;
  };
  const expertApi: ExpertWorkbenchApi = {
    async catalog(revision) {
      return (await callExpert<{ experts: ExpertCatalogEntry[] }>("expert/catalog", { revision })).experts;
    },
    async importExpert(slug, revision) {
      const snapshot = form.getSnapshot();
      if (!snapshot.writable || snapshot.value === undefined) throw new Error(t("unavailable"));
      const existing = snapshot.value.records?.find((record) => record.expertPackage?.slug === slug && record.expertPackage.revision === revision);
      if (existing !== undefined) return existing.id;
      const { record } = await callExpert<{ record: DigitalLifeRecord }>("expert/import", { slug, revision });
      const latest = form.getSnapshot();
      if (!latest.writable || latest.value === undefined) throw new Error(t("unavailable"));
      if (latest.value.stateDir !== snapshot.value.stateDir) throw new Error(t("expertDirectoryChanged"));
      const records = latest.value.records ?? [];
      const samePackage = records.find((item) => item.expertPackage?.slug === slug && item.expertPackage.revision === revision);
      if (samePackage !== undefined) return samePackage.id;
      const next = records.some((item) => item.id === record.id)
        ? { ...record, id: `${record.id}-${revision.slice(0, 8)}` }
        : record;
      if (records.some((item) => item.id === next.id)) throw new Error(t("expertIdConflict", { id: next.id }));
      if (!await form.set("records", [...records, next])) throw new Error(t("writeFailed"));
      return next.id;
    },
    async startReview(request) {
      const available = records();
      const record = available.find((item) => item.id === request.expertIds[0]);
      if (record === undefined || !available.some((item) => item.id === request.reviewerId)) throw new Error(t("chooseExpert"));
      const { sessionId, reference } = await prepareSession(record);
      try {
        ctx.uiWorkspace.openSession(sessionId);
        const result = await reference.binding.session.prompt([{ type: "text", text: reviewSubmission(request, t("reviewRequestInstruction")) }], "queue");
        if (!result.ok) throw new Error(result.error.message);
      } finally { reference.release(); }
    },
    listReviews: () => callExpert<ReviewSummary[]>("review/list", {}),
    readReview: (id) => callExpert<{ run: ReviewRun; markdown: string }>("review/read", { id }),
    async cancelReview(id) { await callExpert("review/cancel", { id }); },
  };
  const injected = (): DigitalLifeSettingSectionInjected => ({
    hooks: { settings: form },
    form,
    t,
    expertApi,
    async loadIdentity(id) {
      const connection = ctx.get("connection") as ConnectionHandle | undefined;
      if (connection === undefined)
        throw new Error("digital-life: connection service is unavailable");
      const rpc = connection.rpc as unknown as ClientConnectionRpc;
      const result = await rpc.call("/digital-life", "identity", { recordId: id });
      if (!result.ok) throw new Error(result.error.message);
      return (result.value as { identity: string }).identity;
    },
  });
  const records = (): NonNullable<DigitalLifeSettings["records"]> =>
    form.getSnapshot().value?.records?.filter((record) => record.enabled) ?? [];
  // The Host `dsh-session` and Client Session Controller both merge a `sessions`
  // service onto Context; read the Client contract explicitly.
  const sessions = ctx.get("sessions") as unknown as ISessions;
  const remote = ctx.get("remote") as ClientRemote;
  const selectDigitalLifeMode = async (sessionId: SessionId): Promise<void> => {
    const roster = await remote.agentPresets.list();
    if (!roster.ok && roster.error.code !== "gateway/invocation-unavailable")
      throw new Error(roster.error.message);
    const modeAvailable = roster.ok && roster.value.presets.some(
      (preset: AgentPresetRow) => preset.id === "digital-life-mode" && preset.broken === undefined,
    );
    if (modeAvailable) {
      const selected = await remote.agentPresets.select(sessionId, "digital-life-mode");
      if (!selected.ok) throw new Error(selected.error.message);
    }
  };
  const prepareSession = async (record?: DigitalLifeRecord) => {
    const connection = ctx.get("connection") as ConnectionHandle | undefined;
    if (connection === undefined)
      throw new Error("digital-life: connection service is unavailable");
    const rpc = connection.rpc as unknown as ClientConnectionRpc;
    const project = await rpc.call("/digital-life", "project", {});
    if (!project.ok) throw new Error(project.error.message);
    const cwd = (project.value as { cwd?: unknown }).cwd;
    if (typeof cwd !== "string" || cwd === "")
      throw new Error("digital-life: project directory is unavailable");
    const sessionId = await sessions.create({ cwd });
    const reference = sessions.retain(sessionId, { source: "digitalLife" });
    try {
      await reference.ready;
      if (record !== undefined) {
        await selectDigitalLifeMode(sessionId);
        const init = await rpc.call("/digital-life", "bind", {
          sessionId,
          recordId: record.id,
        });
        if (!init.ok) throw new Error(init.error.message);
      }
      return { sessionId, reference };
    } catch (error) {
      reference.release();
      throw error;
    }
  };
  const openDigitalLifeSession: PrepareDigitalLifeSession = async (record) => {
    const { sessionId, reference } = await prepareSession(record);
    try {
      ctx.uiWorkspace.openSession(sessionId);
      return sessionId;
    } finally {
      reference.release();
    }
  };
  const createSession: ChatPanelInjected["createSession"] = async (record) => {
    const { sessionId, reference } = await prepareSession(record);
    try {
      const connection = ctx.get("connection") as ConnectionHandle | undefined;
      if (connection === undefined)
        throw new Error("digital-life: connection service is unavailable");
      const rpc = connection.rpc as unknown as ClientConnectionRpc;
      const text =
        record === undefined
          ? t("independentGreeting")
          : t("sessionGreeting", { name: record.name, description: record.description });
      const greeting = await rpc.call("/digital-life", "greeting", { sessionId, text });
      if (!greeting.ok) throw new Error(greeting.error.message);
      ctx.uiWorkspace.openSession(sessionId);
      return sessionId;
    } finally {
      reference.release();
    }
  };

  const chatInjected = (): ChatPanelInjected => ({ records, createSession, t });
  ctx.slots.inject("sidebar.footer.action", () =>
    ctx.slots.register(
      {
        name: "sidebar.footer.action",
        id: "digital-life-chat-panel",
        order: -10,
        locale: NS,
        inject: chatInjected,
      },
      ChatPanel,
    ),
  );
  installAgentPresetSelector(ctx, records, t, openDigitalLifeSession);

  ctx.slots.inject("settings.section", () =>
    ctx.slots.register(
      {
        name: "settings.section",
        id: DIGITAL_LIFE_NAMESPACE,
        order: 25,
        label: () => t("nav"),
        locale: NS,
        inject: injected,
      },
      DigitalLifeSettingSection,
    ),
  );

  const source: InputTriggerSource = {
    trigger: "@",
    name: DIGITAL_LIFE_NAMESPACE,
    order: 5,
    candidates(_session, { query }) {
      const needle = query;
      return Promise.resolve(
        records()
          .filter((item) =>
            `${item.id} ${item.name} ${item.description} ${item.tags.join(" ")}`
              .toLowerCase()
              .includes(needle.toLowerCase()),
          )
          .map((item) => ({
            name: item.id,
            description: `${item.name} · ${item.description}`,
          })),
      );
    },
    warm() {
      void Promise.resolve();
    },
    lexicon() {
      return records().map((item) => item.id);
    },
    subscribeLexicon(_session, listener) {
      return form.subscribe(listener);
    },
    onPick({ candidate }) {
      return { text: `@${candidate.name} ` };
    },
    codec: {
      clipboardText: (ref) => `@${ref}`,
      serialize: (ref) => Promise.resolve(`@${ref}`),
    },
  };
  const inputTriggers = ctx.get("inputTriggers") as InputTriggerServiceContract;
  ctx.effect(
    () => inputTriggers.registerSource(source),
    "digital-life: @ source",
  );
}
