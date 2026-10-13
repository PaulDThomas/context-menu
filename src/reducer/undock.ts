import { withoutEdge } from "./helpers";
import type { DockingState } from "./types";

export type UndockAction = { type: "undock"; id: string; viaDrag?: boolean };

export const undock = (state: DockingState, action: UndockAction): DockingState => {
  const removed = state.dockedWindows.get(action.id);
  if (!removed) {
    return state;
  }
  const dockedWindows = new Map(state.dockedWindows);
  dockedWindows.delete(action.id);

  const edgeIsEmpty = !Array.from(dockedWindows.values()).some(
    (window) => window.edge === removed.edge,
  );

  // A drag undock may re-dock before the gesture ends, so its stored rect is kept
  let preDockRects = state.preDockRects;
  if (!action.viaDrag && preDockRects.has(action.id)) {
    preDockRects = new Map(preDockRects);
    preDockRects.delete(action.id);
  }

  return {
    ...state,
    dockedWindows,
    preDockRects,
    // An empty edge has no panel, so drop its pinned state
    collapsedEdges: edgeIsEmpty
      ? withoutEdge(state.collapsedEdges, removed.edge)
      : state.collapsedEdges,
  };
};
