import type { Context as ClientContext } from "@deepseek-ai/cordis";
import type { SessionId } from "@deepseek-ai/dsh-session/types";
import type { DigitalLifeRecord } from "../types.js";
import type { TranslateNS } from "@deepseek-ai/dsh-client-ui-slots";
export type PrepareDigitalLifeSession = (record: DigitalLifeRecord) => Promise<SessionId>;
/** Install the composite Agent preset and digital-life selector into the Hero slot. */
export declare function installAgentPresetSelector(ctx: ClientContext, records: () => readonly DigitalLifeRecord[], t: TranslateNS<"digital-life">, prepareSession: PrepareDigitalLifeSession): void;
//# sourceMappingURL=installAgentPresetSelector.d.ts.map