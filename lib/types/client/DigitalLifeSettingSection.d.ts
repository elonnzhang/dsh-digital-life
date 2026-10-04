import { type ReactNode } from "react";
import type { PropsRuntime, TranslateNS } from "@deepseek-ai/dsh-client-ui-slots";
import type { ConfigForm, ConfigFormSnapshot } from "@deepseek-ai/dsh-client-ui-settings/client";
import type { DigitalLifeSettings } from "../types.js";
import type { ExpertWorkbenchApi } from "./ExpertWorkbench.js";
export { normalizeDigitalLifeRecord } from "./records.js";
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
/** Render the digital-life settings as 专家 / 专家团 / 通用设置 tabs. */
export declare function DigitalLifeSettingSection(props: Props): ReactNode;
//# sourceMappingURL=DigitalLifeSettingSection.d.ts.map