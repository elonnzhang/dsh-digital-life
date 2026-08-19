import type { Context } from "@deepseek-ai/cordis";

/**
 * The plugin has no independent runtime invariant: settings validation and tool
 * lifecycle are covered by the assembled Host plugin tests.
 */
export function apply(_ctx: Context): void {}
