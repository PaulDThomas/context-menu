import type { DockEdge } from "../components/interface";
import { raise, withoutEdge } from "./helpers";
import type { DockingState, WindowRect } from "./types";

export type DockAction = {
  type: "dock";
  id: string;
  edge: DockEdge;
  preDockRect?: WindowRect | null;
};

export const dock = (state: DockingState, action: DockAction): DockingState => {
  const { id, edge, preDockRect } = action;
  const wasDocked = state.dockedWindows.has(id);
  const dockedWindows = new Map(state.dockedWindows);
  const nextOrder =
    Math.max(
      -1,
      ...Array.from(dockedWindows.values())
        .filter((window) => window.edge === edge && window.id !== id)
        .map((window) => window.order),
    ) + 1;
  dockedWindows.set(id, { id, edge, order: nextOrder });

  const activeWindowsByEdge = new Map(state.activeWindowsByEdge);
  activeWindowsByEdge.set(edge, id);

  // The original floating position is kept for the life of the dock, so a window that is
  // drag-undocked and re-docked in the same gesture still restores where it started
  let preDockRects = state.preDockRects;
  if (!wasDocked && preDockRect && !preDockRects.has(id)) {
    preDockRects = new Map(preDockRects);
    preDockRects.set(id, preDockRect);
  }

  return {
    ...state,
    dockedWindows,
    activeWindowsByEdge,
    preDockRects,
    // Docking a window shows it, so a pinned edge is unpinned
    collapsedEdges: withoutEdge(state.collapsedEdges, edge),
    zOrder: raise(state.zOrder, id),
  };
};
