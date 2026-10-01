import type { DockEdge } from "../components/interface";
import type { DockingState } from "./types";

export type SetDockDragEdgeAction = { type: "setDockDragEdge"; edge: DockEdge | null };

export const setDockDragEdge = (
  state: DockingState,
  action: SetDockDragEdgeAction,
): DockingState => {
  return state.dragSnapEdge === action.edge ? state : { ...state, dragSnapEdge: action.edge };
};
