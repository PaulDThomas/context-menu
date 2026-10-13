import type { DockEdge } from "../components/interface";
import { raise } from "./helpers";
import type { DockingState } from "./types";

export type SetActiveWindowOnEdgeAction = {
  type: "setActiveWindowOnEdge";
  edge: DockEdge;
  id: string;
};

export const setActiveWindowOnEdge = (
  state: DockingState,
  action: SetActiveWindowOnEdgeAction,
): DockingState => {
  const { edge, id } = action;
  const alreadyActive = state.activeWindowsByEdge.get(edge) === id;
  const zOrder = raise(state.zOrder, id);
  if (alreadyActive && zOrder === state.zOrder) {
    return state;
  }
  const activeWindowsByEdge = alreadyActive
    ? state.activeWindowsByEdge
    : new Map(state.activeWindowsByEdge).set(edge, id);
  return { ...state, activeWindowsByEdge, zOrder };
};
