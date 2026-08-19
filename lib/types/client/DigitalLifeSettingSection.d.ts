import { type ReactNode } from "react";
import type { PropsRuntime } from "@deepseek-ai/dsh-client-ui-slots";
import type { SettingsScope, SettingsScopeSnapshot } from "@deepseek-ai/dsh-client-runtime/client";
import type { DigitalLifeRecord, DigitalLifeSettings } from "../types.js";
/**
 * Resolve the identity source stored for an editor draft.
 * @param draft Record entered in the settings editor.
 * @returns A record bound to either its managed Markdown file or an external Agent file.
 */
export declare function normalizeDigitalLifeRecord(draft: DigitalLifeRecord): DigitalLifeRecord;
/** Settings scope and reactive source injected into the settings section. */
export interface DigitalLifeSettingSectionInjected {
    hooks: {
        settings: {
            getSnapshot(): SettingsScopeSnapshot<DigitalLifeSettings>;
            subscribe(listener: () => void): () => void;
        };
    };
    scope: SettingsScope<DigitalLifeSettings>;
    loadIdentity: (id: string) => Promise<string>;
}
type Props = PropsRuntime<"settings.section"> & {
    useSettings: <T>(selector: (snapshot: SettingsScopeSnapshot<DigitalLifeSettings>) => T) => T;
} & Omit<DigitalLifeSettingSectionInjected, "hooks">;
/** Render the persisted digital-life settings editor. */
export declare function DigitalLifeSettingSection(props: Props): ReactNode;
export {};
//# sourceMappingURL=DigitalLifeSettingSection.d.ts.map