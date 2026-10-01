import type { DockEdge, DockedWindow, WindowRect, WindowZRange } from "./interface";

export interface DockingState {
  /** Every docked window, keyed by window id */
  dockedWindows: Map<string, DockedWindow>;
  /** Edges whose panel contents are hidden (pinned) */
  collapsedEdges: Set<DockEdge>;
  /** The window each edge panel is currently showing */
  activeWindowsByEdge: Map<DockEdge, string>;
  /** The element each edge panel renders its docked window into */
  panelContentHosts: Map<DockEdge, HTMLDivElement>;
  /** Where each window was floating before it docked, so undock can restore it */
  preDockRects: Map<string, WindowRect>;
  /** Shared stacking order for every registered window, lowest first */
  zOrder: string[];
  /** The z-index range each registered window may occupy */
  zRanges: Map<string, WindowZRange>;
  /** The window being dragged towards an edge, if any */
  dragWindowId: string | null;
  /** The edge the dragged window would dock into if released now */
  dragSnapEdge: DockEdge | null;
}

export type DockingAction =
  | { type: "dock"; id: string; edge: DockEdge; preDockRect?: WindowRect | null }
  | { type: "undock"; id: string; viaDrag?: boolean }
  | { type: "setActiveWindowOnEdge"; edge: DockEdge; id: string }
  | { type: "setPanelContentHost"; edge: DockEdge; host: HTMLDivElement | null }
  | { type: "toggleEdgeCollapse"; edge: DockEdge }
  | { type: "registerWindow"; id: string; zRange: WindowZRange }
  | { type: "unregisterWindow"; id: string }
  | { type: "raiseWindow"; id: string }
  | { type: "startDockDrag"; id: string }
  | { type: "setDockDragEdge"; edge: DockEdge | null }
  | { type: "endDockDrag"; id: string };

export const initialDockingState: DockingState = {
  dockedWindows: new Map(),
  collapsedEdges: new Set(),
  activeWindowsByEdge: new Map(),
  panelContentHosts: new Map(),
  preDockRects: new Map(),
  zOrder: [],
  zRanges: new Map(),
  dragWindowId: null,
  dragSnapEdge: null,
};

const raise = (zOrder: string[], id: string): string[] => {
  const index = zOrder.indexOf(id);
  if (index === -1 || index === zOrder.length - 1) {
    return zOrder;
  }
  return [...zOrder.filter((windowId) => windowId !== id), id];
};

const withoutEdge = (edges: Set<DockEdge>, edge: DockEdge): Set<DockEdge> => {
  if (!edges.has(edge)) {
    return edges;
  }
  const next = new Set(edges);
  next.delete(edge);
  return next;
};

export const dockingReducer = (state: DockingState, action: DockingAction): DockingState => {
  switch (action.type) {
    case "dock": {
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
    }

    case "undock": {
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
    }

    case "setActiveWindowOnEdge": {
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
    }

    case "setPanelContentHost": {
      const { edge, host } = action;
      if ((state.panelContentHosts.get(edge) ?? null) === host) {
        return state;
      }
      const panelContentHosts = new Map(state.panelContentHosts);
      if (host) {
        panelContentHosts.set(edge, host);
      } else {
        panelContentHosts.delete(edge);
      }
      return { ...state, panelContentHosts };
    }

    case "toggleEdgeCollapse": {
      const collapsedEdges = new Set(state.collapsedEdges);
      if (collapsedEdges.has(action.edge)) {
        collapsedEdges.delete(action.edge);
      } else {
        collapsedEdges.add(action.edge);
      }
      return { ...state, collapsedEdges };
    }

    case "registerWindow": {
      const { id, zRange } = action;
      const current = state.zRanges.get(id);
      if (
        current &&
        current.minZIndex === zRange.minZIndex &&
        current.maxZIndex === zRange.maxZIndex
      ) {
        return state;
      }
      const zRanges = new Map(state.zRanges).set(id, zRange);
      return {
        ...state,
        zRanges,
        zOrder: state.zOrder.includes(id) ? state.zOrder : [...state.zOrder, id],
      };
    }

    case "unregisterWindow": {
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
    }

    case "raiseWindow": {
      const zOrder = raise(state.zOrder, action.id);
      return zOrder === state.zOrder ? state : { ...state, zOrder };
    }

    case "startDockDrag": {
      return { ...state, dragWindowId: action.id, dragSnapEdge: null };
    }

    case "setDockDragEdge": {
      return state.dragSnapEdge === action.edge ? state : { ...state, dragSnapEdge: action.edge };
    }

    case "endDockDrag": {
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
    }
  }
};
