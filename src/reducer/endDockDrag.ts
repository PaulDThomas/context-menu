import type { DockingState } from "./types";

export type EndDockDragAction = { type: "endDockDrag"; id: string };

export const endDockDrag = (state: DockingState, action: EndDockDragAction): DockingState => {
  // A window released while floating keeps no stale floating rect for its next dock
  let preDockRects = state.preDockRects;
  if (!state.dockedWindows.has(action.id) && preDockRects.has(action.id)) {
    preDockRects = new Map(preDockRects);
    preDockRects.delete(action.id);
  }
  if (
    preDockRects === state.preDockRects &&
    state.dragWindowId === null &&
    state.dragSnapEdge === null
  ) {
    return state;
  }
  return { ...state, preDockRects, dragWindowId: null, dragSnapEdge: null };
};
