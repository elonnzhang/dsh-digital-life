import type { ReactNode } from "react";
import type { PropsRuntime } from "@deepseek-ai/dsh-client-ui-slots";
import { IconThinkOutlineRegular } from "@deepseek-ai/dsh-client-ui-primitives";

/** Sidebar glyph for the empty Expert AI template panel. */
export function ExpertAIPanelIcon({ size }: PropsRuntime<"sidebar.panellist">): ReactNode {
  return <IconThinkOutlineRegular size={size} />;
}

/** Empty first-pass panel; the Expert AI surface will be filled in later. */
export function ExpertAIPanel(): null {
  return null;
}
