import type { PropsRuntime, TranslateNS } from "@deepseek-ai/dsh-client-ui-slots";
import type { SessionId } from "@deepseek-ai/dsh-api-remotes/client";
import type { DigitalLifeRecord } from "../types.js";
/** Data and actions supplied by the Host-backed Client installer. */
export interface ChatPanelInjected {
    records: () => readonly DigitalLifeRecord[];
    createSession: (record?: DigitalLifeRecord) => Promise<SessionId>;
    t: TranslateNS<"digital-life">;
}
export type ChatPanelProps = PropsRuntime<"sidebar.footer.action"> & ChatPanelInjected;
export declare function ChatPanel({ wide, records, createSession, t }: ChatPanelProps): import("react").JSX.Element;
//# sourceMappingURL=ChatPanel.d.ts.map