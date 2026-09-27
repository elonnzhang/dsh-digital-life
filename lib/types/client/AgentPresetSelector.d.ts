import type { PropsRuntime, TranslateNS } from "@deepseek-ai/dsh-client-ui-slots";
import type { ObservableSnapshot } from "@deepseek-ai/dsh-client-store";
import type { DigitalLifeRecord } from "../types.js";
/** Display metadata for one selectable Agent preset. */
export interface AgentPresetOption {
    id: string;
    name: string;
    description?: string;
}
/** Callbacks and records injected by the Client installer. */
export interface AgentPresetSelectorInjected {
    load: () => Promise<{
        options: AgentPresetOption[];
        current: string;
        life?: string;
    }>;
    select: (id: string) => Promise<void>;
    records: () => readonly DigitalLifeRecord[];
    selectLife: (id: string) => Promise<void>;
    developerTools: ObservableSnapshot<boolean>;
    t: TranslateNS<"digital-life">;
}
export type AgentPresetSelectorProps = PropsRuntime<"conversation.hero.agentPreset"> & AgentPresetSelectorInjected;
/** Render the Harness-styled Agent preset and digital-life selectors. */
export declare function AgentPresetSelector({ load, select, records, selectLife, developerTools, t, }: AgentPresetSelectorProps): import("react/jsx-runtime").JSX.Element | null;
//# sourceMappingURL=AgentPresetSelector.d.ts.map