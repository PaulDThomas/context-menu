import type { DockEdge } from "../components/interface";
import { raise, withoutEdge } from "./helpers";
import type { DockingState } from "./types";

export type ActivateWindowOnEdgeAction = {
  type: "activateWindowOnEdge";
  edge: DockEdge;
  id?: string;
};

export const activateWindowOnEdge = (
  state: DockingState,
  action: ActivateWindowOnEdgeAction,
): DockingState => {
  const { edge, id } = action;
  // If a specific window is requested, use it; otherwise find the first/active window
  const targetId =
    id ??
    state.activeWindowsByEdge.get(edge) ??
    Array.from(state.dockedWindows.values()).find((w) => w.edge === edge)?.id ??
    null;
  if (!targetId) {
    return state;
  }
  const alreadyActive = state.activeWindowsByEdge.get(edge) === targetId;
  const zOrder = raise(state.zOrder, targetId);
  const collapsed = state.collapsedEdges.has(edge);
  if (alreadyActive && zOrder === state.zOrder && !collapsed) {
    return state;
  }
  const activeWindowsByEdge = alreadyActive
    ? state.activeWindowsByEdge
    : new Map(state.activeWindowsByEdge).set(edge, targetId);
  const collapsedEdges = collapsed ? withoutEdge(state.collapsedEdges, edge) : state.collapsedEdges;
  return { ...state, activeWindowsByEdge, zOrder, collapsedEdges };
};
