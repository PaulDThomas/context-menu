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
  edge: DockEdge;
  id: string;
  order: number;
}

/** Document coordinates and size of a floating window, kept so it can be restored on undock */
export interface WindowRect {
  height: number;
  width: number;
  x: number;
  y: number;
}

/** The z-index range a window may occupy, taken from its `minZIndex`/`maxZIndex` props */
export interface WindowZRange {
  maxZIndex: number;
  minZIndex: number;
}

/** Window configuration and metadata stored in DockingContext */
export interface WindowConfig {
  className?: string;
  allowUndock?: boolean;
  children?: React.ReactNode;
  dockable?: boolean;
  id?: string;
  initialDockEdge?: DockEdge;
  maxZIndex?: number;
  minZIndex?: number;
  moving?: boolean;
  onClose?: () => void;
  onDock?: () => void;
  onMouseDown?: (e: React.MouseEvent<HTMLElement>) => void;
  onOpen?: () => void;
  onUndock?: () => void;
  style?: React.CSSProperties;
  title: string;
  titleElement?: React.ReactNode;
  visible?: boolean;
  windowInDOM?: boolean;
  windowVisible?: boolean;
}

export interface DockingContextType {
  activateWindowOnEdge: (edge: DockEdge, id?: string) => void;
  closeWindow: (id: string) => void;
  /** Dock a window into an edge's panel, optionally recording where it was floating */
  dock: (id: string, edge: DockEdge, preDockRect?: WindowRect | null) => void;
  endDockDrag: (id: string) => void;
  getActiveWindowOnEdge: (edge: DockEdge) => string | null;
  getDockedWindow: (id: string) => DockedWindow | undefined;
  /** Retrieve a window's configuration by ID */
  getWindowConfig: (id: string) => WindowConfig;
  getPanelContentHost: (edge: DockEdge) => HTMLDivElement | null;
  /** The z-index of the edge panel, taken from the window it is showing */
  getPanelZIndex: (edge: DockEdge) => number | null;
  getPreDockRect: (id: string) => WindowRect | null;
  getWindowsOnEdge: (edge: DockEdge) => DockedWindow[];
  getWindowZIndex: (id: string) => number | null;
  isEdgeCollapsed: (edge: DockEdge) => boolean;
  /** Move a window to the top of the shared stacking order */
  raiseWindow: (id: string) => void;
  /** Join the shared stacking order; windows are stacked in registration order until raised */
  registerWindow: (id: string, zRange: WindowZRange) => void;
  registerWindowActions: (
    id: string,
    actions?: { onClose?: () => void; onUndock?: () => void },
  ) => void;
  /** Register a window's configuration (title, dockable status, etc.) */
  registerWindowConfig: (id: string, config: WindowConfig) => void;
  requestUndock: (id: string) => void;
  setActiveWindowOnEdge: (edge: DockEdge, id: string) => void;
  setDockDragEdge: (edge: DockEdge | null) => void;
  setPanelContentHost: (edge: DockEdge, host: HTMLDivElement | null) => void;
  /** Drag to dock: the provider renders the single shared drop zone indicator */
  startDockDrag: (id: string) => void;
  toggleAndRaiseEdge: (edge: DockEdge) => void;
  toggleEdgeCollapse: (edge: DockEdge) => void;
  /** Release a window from its panel; a drag undock keeps the stored floating rect */
  undock: (id: string, options?: { viaDrag?: boolean }) => void;
  unregisterWindow: (id: string) => void;
  unregisterWindowActions: (id: string) => void;
}
