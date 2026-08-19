import type {
  ClientContext,
  ISessions,
} from "@deepseek-ai/dsh-client-runtime/client";
import type { ConnectionHandle } from "@deepseek-ai/dsh-client-connection/client";
import type { DigitalLifeRecord } from "../types.js";
import type { ClientConnectionRpc } from "@deepseek-ai/dsh-client-connection/client";
import {
  AgentPresetSelector,
  type AgentPresetSelectorInjected,
} from "./AgentPresetSelector.js";

/** Install the composite Agent preset and digital-life selector into the Hero slot. */
export function installAgentPresetSelector(
  ctx: ClientContext,
  records: () => readonly DigitalLifeRecord[],
): void {
  const connection = ctx.get("connection") as ConnectionHandle | undefined;
  const sessions = ctx.get("sessions") as ISessions | undefined;
  if (connection === undefined || sessions === undefined) return;
  let selectedPreset = "";
  let selectedLife = "";
  const rpc = connection.rpc as unknown as ClientConnectionRpc;
  const injected = (): AgentPresetSelectorInjected => ({
    records,
    async selectLife(id) {
      selectedLife = id;
      const currentId = sessions.list.getSnapshot().current;
      if (currentId === undefined) return;
      const result = await rpc.call("/digital-life", "bind", {
        sessionId: currentId,
        recordId: id,
      });
      if (!result.ok) throw new Error(result.error.message);
    },
    async load() {
      const response = await connection.api.agentPresets.list({});
      if (!response.result.ok) throw new Error(response.result.error.message);
      const presets = response.result.value.presets.filter(
        (item) => item.broken === undefined,
      );
      const currentId = sessions.list.getSnapshot().current;
      const current =
        currentId === undefined
          ? undefined
          : sessions.list.getSnapshot().byId[currentId]?.agentPreset;
      selectedPreset =
        selectedPreset ||
        current ||
        presets.find((item) => item.isDefault)?.id ||
        presets[0]?.id ||
        "";
      return {
        options: presets.map((item) => ({
          id: item.id,
          name: item.name ?? item.id,
          ...(item.description === undefined
            ? {}
            : { description: item.description }),
        })),
        current: selectedPreset,
      };
    },
    async select(id) {
      selectedPreset = id;
      const currentId = sessions.list.getSnapshot().current;
      if (currentId === undefined) return;
      const summary = sessions.list.getSnapshot().byId[currentId];
      if (summary === undefined || !summary.blank || summary.agentPreset === id)
        return;
      const response = await connection.api.agentPresets.select({
        sessionId: currentId,
        agentPreset: id,
      });
      if (!response.result.ok) throw new Error(response.result.error.message);
      sessions.noteAgentPreset(currentId, response.result.value.agentPreset);
    },
  });
  ctx.effect(() => {
    let appliedKey = "";
    let running = false;
    const applySelection = async (): Promise<void> => {
      if (
        running ||
        selectedPreset !== "digital-life-mode" ||
        selectedLife === ""
      )
        return;
      const state = sessions.list.getSnapshot();
      const currentId = state.current;
      const summary =
        currentId === undefined ? undefined : state.byId[currentId];
      if (summary === undefined || !summary.blank) return;
      const key = `${summary.id}:${selectedPreset}:${selectedLife}`;
      if (key === appliedKey) return;
      running = true;
      try {
        if (summary.agentPreset !== selectedPreset) {
          const preset = await connection.api.agentPresets.select({
            sessionId: summary.id,
            agentPreset: selectedPreset,
          });
          if (!preset.result.ok) throw new Error(preset.result.error.message);
          sessions.noteAgentPreset(summary.id, preset.result.value.agentPreset);
        }
        const persona = await rpc.call("/digital-life", "bind", {
          sessionId: summary.id,
          recordId: selectedLife,
        });
        if (!persona.ok) throw new Error(persona.error.message);
        appliedKey = key;
      } catch (error) {
        console.error("digital-life: failed to apply hero selection", error);
      } finally {
        running = false;
      }
    };
    const stop = sessions.list.subscribe(() => {
      void applySelection();
    });
    void applySelection();
    return stop;
  }, "digital-life: apply hero persona to blank session");
  ctx.slots.inject("conversation.hero.agentPreset", () =>
    ctx.slots.register(
      {
        name: "conversation.hero.agentPreset",
        priority: -10,
        inject: injected,
      },
      AgentPresetSelector,
    ),
  );
}
