import type { DockingState } from "./types";

export type UnregisterWindowAction = { type: "unregisterWindow"; id: string };

export const unregisterWindow = (
  state: DockingState,
  action: UnregisterWindowAction,
): DockingState => {
  if (!state.zRanges.has(action.id)) {
    return state;
  }
  const zRanges = new Map(state.zRanges);
  zRanges.delete(action.id);
  const preDockRects = new Map(state.preDockRects);
  preDockRects.delete(action.id);
  return {
    ...state,
    zRanges,
    preDockRects,
    zOrder: state.zOrder.filter((windowId) => windowId !== action.id),
  };
};
