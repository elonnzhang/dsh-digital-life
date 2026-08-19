import type { DigitalLifeRecord } from "../types.js";
/** Resolve the per-digital-life storage root. */
export declare function digitalLifeHome(env?: Record<string, string | undefined>, stateDir?: string): string;
/** WorkBuddy-compatible canonical agent location. */
export declare function agentPath(id: string, stateDir?: string): string;
/**
 * Return the portable path stored for a managed identity.
 * @param id Digital-life record ID.
 * @returns A path relative to the configured digital-life state directory.
 */
export declare function managedAgentBinding(id: string): string;
/** Agent files may carry YAML frontmatter; only the Markdown body is identity. */
export declare function agentIdentity(markdown: string): string;
/** Render a Claude/WorkBuddy-compatible agent file. */
export declare function agentDocument(record: DigitalLifeRecord, identity: string): string;
/**
 * Read an Agent Markdown identity from an absolute, home-relative, or state-relative path.
 * @param path Agent file path stored in settings.
 * @param stateDir Optional digital-life state directory for relative paths.
 * @returns The Markdown body without YAML frontmatter.
 */
export declare function readAgentIdentity(path: string, stateDir?: string): Promise<string>;
/** Read the canonical persisted expert identity. */
export declare function identityFor(record: DigitalLifeRecord, stateDir?: string): Promise<string>;
/** Ensure every managed life owns agents/<id>.md and migrate the old AGENTS.md layout. */
export declare function initializeIdentities(records: readonly DigitalLifeRecord[], stateDir?: string): Promise<void>;
/** Persist identity/metadata edits and remove storage for deleted records. */
export declare function reconcileIdentities(previous: readonly DigitalLifeRecord[], next: readonly DigitalLifeRecord[], stateDir?: string): Promise<void>;
//# sourceMappingURL=identity.d.ts.map