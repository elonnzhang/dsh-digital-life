import type { Context, Volatile } from "@deepseek-ai/cordis";
import type { Session } from "@deepseek-ai/dsh-session";
import z from "@deepseek-ai/schemastery";
import { type ContentBlock } from "@deepseek-ai/dsh-llm";
import type { ExpertTeam } from "../expert-types.js";
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
    teams: Volatile<ExpertTeam[]>;
}
export declare const Config: z<DigitalLifeSettings, Config>;
export declare function validateSettings(settings: DigitalLifeSettings): void;
/** Identity of a team's session host when the team sets none. */
export declare const DEFAULT_TEAM_PERSONA: string;
/** Append the local opening message without entering the agent loop. */
export declare function appendOpeningAssistantMessage(session: Session, text: string): void;
/** Durable system prompt of a standalone digital life, split so the identity file is a section of its own. */
export interface IndependentSystemPrompt {
    /** Header and profile, placed before the identity. */
    pre: string;
    /** The identity file (AGENTS.md) verbatim. */
    persona: string;
    /** Package, conversation and collaboration rules, placed after the identity. */
    suf: string;
}
/** Build the durable system prompt sections for a selected standalone digital life. */
export declare function independentSystemPromptPartsFor(record: DigitalLifeRecord, identity?: string): IndependentSystemPrompt;
/** The standalone system prompt as one text, in section order. */
export declare function independentSystemPromptFor(record: DigitalLifeRecord, identity?: string): string;
/** A team a session is hosted for: a saved team, or an ad-hoc lineup without an id. */
export type HostedTeam = Omit<ExpertTeam, "id" | "purpose"> & {
    id?: string;
    purpose?: string;
};
/** Build the durable system prompt sections for a session hosted by an expert team. */
export declare function teamSystemPromptPartsFor(team: HostedTeam, records: readonly DigitalLifeRecord[]): IndependentSystemPrompt;
/**
 * Build the one-shot consultation prompt for a digital life.
 * The identity itself is installed as the subagent persona, so it is not repeated here.
 */
export declare function promptFor(record: DigitalLifeRecord, question: string): ContentBlock[];
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map