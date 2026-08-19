import { type ReactNode } from 'react';
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { SettingsScope, SettingsScopeSnapshot } from '@deepseek-ai/dsh-client-runtime/client';
import type { DigitalLifeSettings } from '../types.js';
export interface DigitalLifeSectionInjected {
    hooks: {
        settings: {
            getSnapshot(): SettingsScopeSnapshot<DigitalLifeSettings>;
            subscribe(listener: () => void): () => void;
        };
    };
    scope: SettingsScope<DigitalLifeSettings>;
}
type Props = PropsRuntime<'settings.section'> & {
    useSettings: <T>(selector: (snapshot: SettingsScopeSnapshot<DigitalLifeSettings>) => T) => T;
} & Omit<DigitalLifeSectionInjected, 'hooks'>;
export declare function DigitalLifeSection(props: Props): ReactNode;
export {};
//# sourceMappingURL=DigitalLifeSection.d.ts.map