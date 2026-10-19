import { resolveArtifactBlock } from "./decision";
import type { TableArtifact } from "./types";

export const OPEN_INTELLIGENT_UI_ENABLED =
  process.env.NEXT_PUBLIC_OPEN_INTELLIGENT_UI === "true";

export type OpenUIVisualRoute = {
  renderer: "a2ui" | "open-generative-ui";
  block: "table" | "chart" | "graph";
};

/**
 * Jev-compatible routing contract for Open Intelligent UI.
 *
 * Tables stay declarative through A2UI; charts and graphs are candidates for
 * Open Generative UI. The native BRH renderer is the fallback when the hybrid
 * runtime is disabled or no generated activity arrives.
 */
export function openUIVisualRoute(artifact: TableArtifact): OpenUIVisualRoute {
  const block = resolveArtifactBlock(artifact);
  return {
    renderer: block === "table" ? "a2ui" : "open-generative-ui",
    block,
  };
}
