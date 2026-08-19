import type { Context } from "@deepseek-ai/cordis";
import z from "@deepseek-ai/schemastery";
import type { ContentBlock } from "@deepseek-ai/dsh-llm";
import type { DigitalLifeRecord, DigitalLifeSettings } from "../types.js";
export declare const name = "digital-life";
export declare const inject: string[];
export declare const Config: z<DigitalLifeSettings>;
export declare function validateSettings(settings: DigitalLifeSettings): void;
/** Build the durable system prompt for a selected standalone digital life. */
export declare function independentSystemPromptFor(record: DigitalLifeRecord, identity?: string): string;
/** Build the one-shot consultation prompt for a digital life. */
export declare function promptFor(record: DigitalLifeRecord, question: string, identity?: string): ContentBlock[];
export declare function apply(ctx: Context, entry: DigitalLifeSettings): void;
//# sourceMappingURL=index.d.ts.map