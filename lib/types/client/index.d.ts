import type { Context as ClientContext } from "@deepseek-ai/cordis";
import { type DigitalLifeKey } from "./locales.js";
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
export declare const inject: string[];
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map