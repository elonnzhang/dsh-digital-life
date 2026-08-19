import { DIGITAL_LIFE_CATEGORIES } from "./constants.js";
export type DigitalLifeCategory = (typeof DIGITAL_LIFE_CATEGORIES)[number];
export interface DigitalLifeRecord {
    id: string;
    name: string;
    description: string;
    /** Stable primary domain used for coarse grouping and routing. */
    category: DigitalLifeCategory;
    /** User-defined domain label when category is custom. */
    customCategory?: string;
    /** Composable characteristics used for search and future team routing. */
    tags: string[];
    /** @deprecated Legacy single tag, accepted only for settings migration. */
    tag?: string;
    /** Legacy/editor identity text, persisted to the record's agents/<id>.md. */
    persona: string;
    /** Optional ~/.agent/agents or ~/.claude/agents Markdown identity source. */
    agent?: string;
    toolFilter?: string[];
    model?: {
        provider?: string;
        model?: string;
    };
    enabled: boolean;
}
export interface DigitalLifeSettings {
    provider?: string;
    maxBatchSize?: number;
    /** Optional plugin state directory. Defaults to ~/.dsh/digital-life. */
    stateDir?: string;
    records?: DigitalLifeRecord[];
}
export interface ResolvedDigitalLifeSettings {
    provider: string;
    maxBatchSize: number;
    records: DigitalLifeRecord[];
}
//# sourceMappingURL=types.d.ts.map