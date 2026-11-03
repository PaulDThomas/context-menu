import type { DockingState } from "./types";

export type StartDockDragAction = { type: "startDockDrag"; id: string };

export const startDockDrag = (state: DockingState, action: StartDockDragAction): DockingState => {
  return { ...state, dragWindowId: action.id, dragSnapEdge: null };
};
