import type { Context, Volatile } from "@deepseek-ai/cordis";
import type { Session } from "@deepseek-ai/dsh-session";
import z from "@deepseek-ai/schemastery";
import { type ContentBlock } from "@deepseek-ai/dsh-llm";
import type { DigitalLifeRecord, DigitalLifeSettings } from "../types.js";
export declare const name = "digital-life";
export declare const inject: string[];
/**
 * Live plugin config. Every editable field is `.volatile()` so a settings
 * write applies to the running fiber in place (no reload), and the Client
 * settings form can edit them. Access a field's current value with
 * `config.<field>.get()`.
 */
export interface Config {
    provider: Volatile<string>;
    maxBatchSize: Volatile<number>;
    stateDir: Volatile<string | undefined>;
    records: Volatile<DigitalLifeRecord[]>;
}
export declare const Config: z<DigitalLifeSettings, Config>;
export declare function validateSettings(settings: DigitalLifeSettings): void;
/** Append the local opening message without entering the agent loop. */
export declare function appendOpeningAssistantMessage(session: Session, text: string): void;
/** Build the durable system prompt for a selected standalone digital life. */
export declare function independentSystemPromptFor(record: DigitalLifeRecord, identity?: string): string;
/** Build the one-shot consultation prompt for a digital life. */
export declare function promptFor(record: DigitalLifeRecord, question: string, identity?: string): ContentBlock[];
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map