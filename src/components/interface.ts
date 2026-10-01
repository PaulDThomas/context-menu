export interface IMenuItem {
  label: string | React.ReactElement;
  disabled?: boolean;
  selected?: boolean;
  selectedIcon?: React.ReactNode;
  action?: (target?: Range | null, reactEvent?: React.MouseEvent) => Promise<void> | void;
  group?: IMenuItem[];
}

export type Effect = "fadeIn" | "fadeOut";

// Docking types
export type DockEdge = "top" | "right" | "bottom" | "left";

export interface DockedWindow {
  id: string;
  edge: DockEdge;
  order: number;
}

/** Document coordinates and size of a floating window, kept so it can be restored on undock */
export interface WindowRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The z-index range a window may occupy, taken from its `minZIndex`/`maxZIndex` props */
export interface WindowZRange {
  minZIndex: number;
  maxZIndex: number;
}

/** Window configuration and metadata stored in DockingContext */
export interface WindowConfig {
  title: string;
  titleElement?: React.ReactNode;
  dockable?: boolean;
  initialDockEdge?: DockEdge;
  allowUndock?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  onMouseDown?: (e: React.MouseEvent<HTMLElement>) => void;
  onDock?: () => void;
  onUndock?: () => void;
  moving?: boolean;
}

export interface DockingContextType {
  /** Dock a window into an edge's panel, optionally recording where it was floating */
  dock: (id: string, edge: DockEdge, preDockRect?: WindowRect | null) => void;
  /** Release a window from its panel; a drag undock keeps the stored floating rect */
  undock: (id: string, options?: { viaDrag?: boolean }) => void;
  getDockedWindow: (id: string) => DockedWindow | undefined;
  getWindowsOnEdge: (edge: DockEdge) => DockedWindow[];
  setActiveWindowOnEdge: (edge: DockEdge, id: string) => void;
  getActiveWindowOnEdge: (edge: DockEdge) => string | null;
  activateWindowOnEdge: (edge: DockEdge, id?: string) => void;
  toggleAndRaiseEdge: (edge: DockEdge) => void;
  setPanelContentHost: (edge: DockEdge, host: HTMLDivElement | null) => void;
  getPanelContentHost: (edge: DockEdge) => HTMLDivElement | null;
  isEdgeCollapsed: (edge: DockEdge) => boolean;
  toggleEdgeCollapse: (edge: DockEdge) => void;
  /** Join the shared stacking order; windows are stacked in registration order until raised */
  registerWindow: (id: string, zRange: WindowZRange) => void;
  unregisterWindow: (id: string) => void;
  /** Register a window's configuration (title, dockable status, etc.) */
  registerWindowConfig: (id: string, config: WindowConfig) => void;
  /** Retrieve a window's configuration by ID */
  getWindowConfig: (id: string) => WindowConfig | undefined;
  registerWindowActions: (
    id: string,
    actions?: { onClose?: () => void; onUndock?: () => void },
  ) => void;
  unregisterWindowActions: (id: string) => void;
  closeWindow: (id: string) => void;
  requestUndock: (id: string) => void;
  /** Move a window to the top of the shared stacking order */
  raiseWindow: (id: string) => void;
  getWindowZIndex: (id: string) => number | null;
  /** The z-index of the edge panel, taken from the window it is showing */
  getPanelZIndex: (edge: DockEdge) => number | null;
  getPreDockRect: (id: string) => WindowRect | null;
  /** Drag to dock: the provider renders the single shared drop zone indicator */
  startDockDrag: (id: string) => void;
  setDockDragEdge: (edge: DockEdge | null) => void;
  endDockDrag: (id: string) => void;
}
