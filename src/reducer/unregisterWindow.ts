import type { DockingState } from "./types";

export type UnregisterWindowAction = { type: "unregisterWindow"; id: string };

export const unregisterWindow = (
  state: DockingState,
  action: UnregisterWindowAction,
): DockingState => {
  if (!state.zOrder.includes(action.id)) {
    return state;
  }
  const preDockRects = new Map(state.preDockRects);
  preDockRects.delete(action.id);
  const windowConfigs = new Map(state.windowConfigs);
  windowConfigs.delete(action.id);
  return {
    ...state,
    preDockRects,
    windowConfigs,
    zOrder: state.zOrder.filter((windowId) => windowId !== action.id),
  };
};
