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
export type StackDirection = "vertical" | "horizontal";

export interface DockedWindow {
  id: string;
  edge: DockEdge;
  stackDirection: StackDirection;
  isCollapsed: boolean;
  order: number;
}

export interface DockingState {
  dockedWindows: Map<string, DockedWindow>;
  collapsedEdges: Set<DockEdge>;
}

export interface DockingContextType {
  state: DockingState;
  dock: (id: string, edge: DockEdge, stackDirection: StackDirection) => void;
  undock: (id: string) => void;
  toggleCollapse: (id: string) => void;
  getDockedWindow: (id: string) => DockedWindow | undefined;
  getWindowsOnEdge: (edge: DockEdge) => DockedWindow[];
  isEdgeCollapsed: (edge: DockEdge) => boolean;
  toggleEdgeCollapse: (edge: DockEdge) => void;
}
