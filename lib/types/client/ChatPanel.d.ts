import type { PropsRuntime } from "@deepseek-ai/dsh-client-ui-slots";
import type { SessionId } from "@deepseek-ai/dsh-api-remotes/client";
import type { DigitalLifeRecord } from "../types.js";
/** Data and actions supplied by the Host-backed Client installer. */
export interface ChatPanelInjected {
    records: () => readonly DigitalLifeRecord[];
    createSession: (record?: DigitalLifeRecord) => Promise<SessionId>;
}
export type ChatPanelProps = PropsRuntime<"sidebar.footer.action"> & ChatPanelInjected;
export declare function ChatPanel({ wide, records, createSession }: ChatPanelProps): import("react").JSX.Element;
//# sourceMappingURL=ChatPanel.d.ts.map