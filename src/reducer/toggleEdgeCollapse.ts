import type { DockEdge } from "../components/interface";
import type { DockingState } from "./types";

export type ToggleEdgeCollapseAction = { type: "toggleEdgeCollapse"; edge: DockEdge };

export const toggleEdgeCollapse = (
  state: DockingState,
  action: ToggleEdgeCollapseAction,
): DockingState => {
  const collapsedEdges = new Set(state.collapsedEdges);
  if (collapsedEdges.has(action.edge)) {
    collapsedEdges.delete(action.edge);
  } else {
    collapsedEdges.add(action.edge);
  }
  return { ...state, collapsedEdges };
};
