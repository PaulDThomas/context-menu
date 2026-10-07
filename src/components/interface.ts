import type { DockingAction } from "../reducer";

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

/** The z-index range a window may occupy, provided by DockingProvider */
export interface WindowZRange {
  maxZIndex: number;
  minZIndex: number;
}

/** Window configuration and metadata stored in DockingContext */
export interface WindowConfig {
  className?: string;
  allowUndock?: boolean;
  canClose?: boolean;
  canDock?: boolean;
  canUndock?: boolean;
  children?: React.ReactNode;
  defaultDockEdge?: DockEdge;
  dockable?: boolean;
  id?: string;
  initialDockEdge?: DockEdge;
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
  windowVisible?: boolean;
}

export interface DockingContextType {
  maxZIndex: number;
  minZIndex: number;
  dispatch: React.Dispatch<DockingAction>;
  closeWindow: (id: string) => void;
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
  registerWindowActions: (
    id: string,
    actions?: { onClose?: () => void; onUndock?: () => void },
  ) => void;
  /** Register or update a window's configuration; partial updates are merged into the stored config */
  registerWindowConfig: (id: string, config: Partial<WindowConfig>) => void;
  requestUndock: (id: string) => void;
  unregisterWindowActions: (id: string) => void;
}
