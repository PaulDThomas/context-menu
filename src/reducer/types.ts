import type { DockEdge, DockedWindow, WindowConfig, WindowRect } from "../components/interface";

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
  /** Per-window UI metadata used by ContextWindow and title bar rendering */
  windowConfigs: Map<string, WindowConfig>;
  /** Shared stacking order for every registered window, lowest first */
  zOrder: string[];
  /** The window being dragged towards an edge, if any */
  dragWindowId: string | null;
  /** The edge the dragged window would dock into if released now */
  dragSnapEdge: DockEdge | null;
}

export type DockingAction =
  | { type: "dock"; id: string; edge: DockEdge; preDockRect?: WindowRect | null }
  | { type: "undock"; id: string; viaDrag?: boolean }
  | { type: "setActiveWindowOnEdge"; edge: DockEdge; id: string }
  | { type: "activateWindowOnEdge"; edge: DockEdge; id?: string }
  | { type: "setPanelContentHost"; edge: DockEdge; host: HTMLDivElement | null }
  | { type: "toggleEdgeCollapse"; edge: DockEdge }
  | { type: "toggleAndRaiseEdge"; edge: DockEdge }
  | { type: "registerWindow"; id: string }
  | { type: "registerWindowConfig"; id: string; config: Partial<WindowConfig> }
  | { type: "unregisterWindow"; id: string }
  | { type: "raiseWindow"; id: string }
  | { type: "startDockDrag"; id: string }
  | { type: "setDockDragEdge"; edge: DockEdge | null }
  | { type: "endDockDrag"; id: string }
  | { type: "saveWindowPosition"; id: string; rect: WindowRect };

export const initialDockingState: DockingState = {
  dockedWindows: new Map(),
  collapsedEdges: new Set(),
  activeWindowsByEdge: new Map(),
  panelContentHosts: new Map(),
  preDockRects: new Map(),
  windowConfigs: new Map(),
  zOrder: [],
  dragWindowId: null,
  dragSnapEdge: null,
};

// Re-export types that action handlers need
export type { WindowRect };
