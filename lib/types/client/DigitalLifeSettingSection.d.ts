import { type ReactNode } from "react";
import type { PropsRuntime, TranslateNS } from "@deepseek-ai/dsh-client-ui-slots";
import type { ConfigForm, ConfigFormSnapshot } from "@deepseek-ai/dsh-client-ui-settings/client";
import type { DigitalLifeRecord, DigitalLifeSettings } from "../types.js";
import { type ExpertWorkbenchApi } from "./ExpertWorkbench.js";
/**
 * Resolve the identity source stored for an editor draft.
 * @param draft Record entered in the settings editor.
 * @returns A record bound to either its managed Markdown file or an external Agent file.
 */
export declare function normalizeDigitalLifeRecord(draft: DigitalLifeRecord): DigitalLifeRecord;
/** Config form and reactive source injected into the settings section. */
export interface DigitalLifeSettingSectionInjected {
    hooks: {
        settings: {
            getSnapshot(): ConfigFormSnapshot<DigitalLifeSettings>;
            subscribe(listener: () => void): () => void;
        };
    };
    form: ConfigForm<DigitalLifeSettings>;
    loadIdentity: (id: string) => Promise<string>;
    expertApi: ExpertWorkbenchApi;
    t: TranslateNS<"digital-life">;
}
type Props = PropsRuntime<"settings.section"> & {
    useSettings: <T>(selector: (snapshot: ConfigFormSnapshot<DigitalLifeSettings>) => T) => T;
} & Omit<DigitalLifeSettingSectionInjected, "hooks">;
/** Render the persisted digital-life settings editor. */
export declare function DigitalLifeSettingSection(props: Props): ReactNode;
export {};
//# sourceMappingURL=DigitalLifeSettingSection.d.ts.map