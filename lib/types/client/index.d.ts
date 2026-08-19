import type { ClientContext } from "@deepseek-ai/dsh-client-runtime/client";
import { type DigitalLifeKey } from "./locales.js";
declare module "@deepseek-ai/dsh-client-ui-slots" {
    interface LocaleNamespaceMap {
        "digital-life": DigitalLifeKey;
    }
}
export declare const inject: string[];
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map