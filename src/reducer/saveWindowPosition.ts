import type { DockingState } from "./types";

export type SaveWindowPositionAction = {
  type: "saveWindowPosition";
  id: string;
  rect: { x: number; y: number; width: number; height: number };
};

export const saveWindowPosition = (
  state: DockingState,
  action: SaveWindowPositionAction,
): DockingState => {
  const preDockRects = new Map(state.preDockRects);
  preDockRects.set(action.id, action.rect);
  return { ...state, preDockRects };
};
