import type { DockEdge } from "../components/interface";
import { raise } from "./helpers";
import type { DockingState } from "./types";

export type ToggleAndRaiseEdgeAction = { type: "toggleAndRaiseEdge"; edge: DockEdge };

export const toggleAndRaiseEdge = (
  state: DockingState,
  action: ToggleAndRaiseEdgeAction,
): DockingState => {
  const { edge } = action;
  const collapsedEdges = new Set(state.collapsedEdges);
  if (collapsedEdges.has(edge)) {
    collapsedEdges.delete(edge);
  } else {
    collapsedEdges.add(edge);
  }
  // When toggling, also ensure the edge's panel is brought to top by raising its active window
  const activeId =
    state.activeWindowsByEdge.get(edge) ??
    Array.from(state.dockedWindows.values()).find((w) => w.edge === edge)?.id ??
    null;
  const zOrder = activeId ? raise(state.zOrder, activeId) : state.zOrder;
  return { ...state, collapsedEdges, zOrder };
};
