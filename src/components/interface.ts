import type { DockingAction, DockingState } from "../reducer";

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
  titleBarButtons?: React.ReactNode;
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

/** Public docking operations and state selectors returned by `useDocking`. */
export interface DockingContextType {
  /** Highest z-index available to a managed window. */
  maxZIndex: number;
  /** Lowest z-index assigned to an unregistered or bottom-most window. */
  minZIndex: number;
  /** Dispatch a reducer action for advanced docking integrations. */
  dispatch: React.Dispatch<DockingAction>;
  /** Invoke the registered close callback for a window, if it has one. */
  closeWindow: (id: string) => void;
  /** Return the active window ID on an edge, or `null` when no window is docked there. */
  getActiveWindowOnEdge: (edge: DockEdge) => string | null;
  /** Raise a registered window to the top of the shared stacking order. */
  showWindowById: (id: string) => void;
  /** Return a window's dock information, or `undefined` if it is floating. */
  getDockedWindow: (id: string) => DockedWindow | undefined;
  /** Retrieve a window's configuration by ID, with an ID-based fallback title. */
  getWindowConfig: (id: string) => WindowConfig;
  /** Return the controller registered for a window, if present. */
  getWindowController: (id: string) => DockingWindowController | undefined;
  /** Return the portal host for an edge panel, or `null` when it has no host. */
  getPanelContentHost: (edge: DockEdge) => HTMLDivElement | null;
  /** Return the active window's z-index for an edge panel, or `null` when empty. */
  getPanelZIndex: (edge: DockEdge) => number | null;
  /** Return the floating position saved before docking, or `null` if none is saved. */
  getPreDockRect: (id: string) => WindowRect | null;
  /** Return docked windows on an edge ordered from first to last tab. */
  getWindowsOnEdge: (edge: DockEdge) => DockedWindow[];
  /** Return a window's stacking slot, defaulting to `minZIndex` when unregistered. */
  getWindowZIndex: (id: string) => number;
  /** Return whether an edge's dock panel is collapsed. */
  isEdgeCollapsed: (edge: DockEdge) => boolean;
  /** Register or replace callbacks used by window controls and title bars. */
  registerWindowController: (id: string, controller: DockingWindowController) => void;
  /** Register or update a window's configuration; partial values merge with the stored config. */
  registerWindowConfig: (id: string, config: Partial<WindowConfig>) => void;
  /** Remove the registered controller for a window. */
  unregisterWindowController: (id: string) => void;
}

/** Internal value provided by `DockingProvider` and consumed by `useDocking`. */
export interface DockingContextValue {
  dispatch: React.Dispatch<DockingAction>;
  maxZIndex: number;
  minZIndex: number;
  state: DockingState;
  windowControllers: React.RefObject<Map<string, DockingWindowController>>;
}
