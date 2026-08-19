import type {
  ClientContext,
  ISessions,
  SessionId,
} from "@deepseek-ai/dsh-client-runtime/client";
import type {
  InputTriggerServiceContract,
  InputTriggerSource,
} from "@deepseek-ai/dsh-client-ui-input-trigger/client";
import type {} from "@deepseek-ai/dsh-client-ui-settings/client";
import type {} from "@deepseek-ai/dsh-client-ui-settings-plugins/client";
import type {} from "@deepseek-ai/dsh-client-ui-layout/client";
import type {} from "@deepseek-ai/dsh-client-ui-sidebar/client";
import type {
  ClientConnectionRpc,
  ConnectionHandle,
} from "@deepseek-ai/dsh-client-connection/client";
import { DIGITAL_LIFE_NAMESPACE } from "../constants.js";
import type { DigitalLifeSettings } from "../types.js";
import {
  DigitalLifeSettingSection,
  type DigitalLifeSettingSectionInjected,
} from "./DigitalLifeSettingSection.js";
import { ChatPanel, type ChatPanelInjected } from "./ChatPanel.js";
import { installAgentPresetSelector } from "./installAgentPresetSelector.js";

export const inject = [
  "slots",
  "inputTriggers",
  "connection",
  "remote",
  "settingsScope",
];

export function apply(ctx: ClientContext): void {
  const scope = ctx.settingsScope.bind<DigitalLifeSettings>({
    namespace: DIGITAL_LIFE_NAMESPACE,
  });
  const hookSource = {
    getSnapshot: () => scope.getSnapshot(),
    subscribe: (listener: () => void) => scope.subscribe(listener),
  };
  const injected = (): DigitalLifeSettingSectionInjected => ({
    hooks: { settings: hookSource },
    scope,
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
    scope.getSnapshot().value?.records?.filter((record) => record.enabled) ??
    [];
  const createSession: ChatPanelInjected["createSession"] = async (record) => {
    const connection = ctx.get("connection") as ConnectionHandle | undefined;
    if (connection === undefined)
      throw new Error("digital-life: connection service is unavailable");
    const sessions = ctx.get("sessions") as ISessions | undefined;
    if (sessions === undefined)
      throw new Error("digital-life: sessions service is unavailable");
    const rpc = connection.rpc as unknown as ClientConnectionRpc;
    const generated =
      `digital-life-${record?.id ?? "independent"}-${Date.now()}` as SessionId;
    const result = await connection.api.sessions.create({
      sessionId: generated,
      ...(record === undefined ? {} : { agentPreset: "digital-life-mode" }),
    });
    if (!result.result.ok) throw new Error(result.result.error.message);
    const sessionId = result.result.value.sessionId;
    await new Promise<void>((resolve, reject) => {
      let disposed = false;
      let dispose = (): void => {};
      const finish = (error?: Error): void => {
        if (disposed) return;
        disposed = true;
        window.clearTimeout(timer);
        dispose();
        if (error === undefined) resolve();
        else reject(error);
      };
      const settle = (): void => {
        if (sessions.binding(sessionId) !== undefined) finish();
      };
      dispose = sessions.list.subscribe(settle);
      const timer = window.setTimeout(() => {
        finish(
          new Error(
            `digital-life: created session "${sessionId}" was not published to the client`,
          ),
        );
      }, 10000);
      settle();
    });
    sessions.open(sessionId);
    const session = sessions.binding(sessionId)?.session;
    if (session === undefined)
      throw new Error(`digital-life: unknown created session "${sessionId}"`);
    if (record !== undefined) {
      const init = await rpc.call("/digital-life", "bind", {
        sessionId,
        recordId: record.id,
      });
      if (!init.ok) throw new Error(init.error.message);
    }
    const accepted = await session.prompt(
      [
        {
          type: "text",
          text:
            record === undefined
              ? "你好，我们开始一个独立对话。请简短确认对话已开始，并询问我想讨论什么。"
              : `你好。请保持数字生命“${record.name}”的身份开始独立对话。职责描述：${record.description}。请先简短介绍你能提供的帮助。`,
        },
      ],
      "queue",
    );
    if (!accepted.ok) throw new Error(accepted.error.message);
    return sessionId;
  };

  const chatInjected = (): ChatPanelInjected => ({ records, createSession });
  ctx.slots.inject("sidebar.footer.action", () =>
    ctx.slots.register(
      {
        name: "sidebar.footer.action",
        id: "digital-life-chat-panel",
        order: -10,
        inject: chatInjected,
      },
      ChatPanel,
    ),
  );
  installAgentPresetSelector(ctx, records);

  ctx.slots.inject("settings.section", () =>
    ctx.slots.register(
      {
        name: "settings.section",
        id: DIGITAL_LIFE_NAMESPACE,
        order: 25,
        label: "数字生命",
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
      return scope.subscribe(listener);
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
