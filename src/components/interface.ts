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
  style?: React.CSSProperties;
  title: string;
  titleElement?: React.ReactNode;
  visible?: boolean;
  windowVisible?: boolean;
}

export interface DockingWindowController {
  windowRef: React.RefObject<HTMLDivElement | null>;
  onClose?: () => void;
  onMouseDown?: (event: React.MouseEvent<HTMLElement>) => void;
  onOpen?: () => void;
  onDock?: (edge: DockEdge) => void;
  onUndock?: () => void;
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
  getWindowController: (id: string) => DockingWindowController | undefined;
  getPanelContentHost: (edge: DockEdge) => HTMLDivElement | null;
  /** The z-index of the edge panel, taken from the window it is showing */
  getPanelZIndex: (edge: DockEdge) => number | null;
  getPreDockRect: (id: string) => WindowRect | null;
  getWindowsOnEdge: (edge: DockEdge) => DockedWindow[];
  /** Returns the stacking slot, defaulting to the provider minimum for unregistered IDs. */
  getWindowZIndex: (id: string) => number;
  isEdgeCollapsed: (edge: DockEdge) => boolean;
  registerWindowController: (id: string, controller: DockingWindowController) => void;
  /** Register or update a window's configuration; partial updates are merged into the stored config */
  registerWindowConfig: (id: string, config: Partial<WindowConfig>) => void;
  unregisterWindowController: (id: string) => void;
}
