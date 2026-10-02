import { MAX_Z_INDEX, MIN_Z_INDEX } from "../../functions/contextWindowConstants";
import type {
  DockEdge,
  DockedWindow,
  DockingContextType,
  WindowConfig,
  WindowRect,
} from "../interface";

interface WindowActions {
  onClose?: () => void;
  onUndock?: () => void;
}
const noop = (): void => undefined;

/**
 * A minimal docking context backed by plain Maps, for tests that need to drive components
 * without the full provider. `notify` is called whenever the backing Maps change so a host
 * component can re-render its consumers.
 */
export const createMockDocking = (
  dockedWindows: Map<string, DockedWindow>,
  overrides: Partial<DockingContextType> = {},
  notify: () => void = () => {},
  preDockRects: Map<string, WindowRect> = new Map(),
  collapsedEdges: Set<DockEdge> = new Set(),
  activeWindowsByEdge: Map<DockEdge, string> = new Map(),
  windowConfigs: Map<string, WindowConfig> = new Map(),
  windowActions: Map<string, WindowActions> = new Map(),
): DockingContextType => ({
  maxZIndex: MAX_Z_INDEX,
  minZIndex: MIN_Z_INDEX,
  dispatch: (action) => {
    if (action.type === "dock") {
      if (action.preDockRect && !preDockRects.has(action.id)) {
        preDockRects.set(action.id, action.preDockRect);
      }
      dockedWindows.set(action.id, { id: action.id, edge: action.edge, order: 0 });
      activeWindowsByEdge.set(action.edge, action.id);
      notify();
      return;
    }
    if (action.type === "undock") {
      dockedWindows.delete(action.id);
      if (!action.viaDrag) {
        preDockRects.delete(action.id);
      }
      notify();
      return;
    }
    if (action.type === "setActiveWindowOnEdge") {
      activeWindowsByEdge.set(action.edge, action.id);
      notify();
      return;
    }
    if (action.type === "activateWindowOnEdge") {
      const targetId = action.id ?? activeWindowsByEdge.get(action.edge) ?? null;
      if (targetId) {
        activeWindowsByEdge.set(action.edge, targetId);
        collapsedEdges.delete(action.edge);
        notify();
      }
      return;
    }
    if (action.type === "toggleAndRaiseEdge" || action.type === "toggleEdgeCollapse") {
      if (collapsedEdges.has(action.edge)) {
        collapsedEdges.delete(action.edge);
      } else {
        collapsedEdges.add(action.edge);
      }
      notify();
    }
  },
  getDockedWindow: (id: string) => dockedWindows.get(id),
  getWindowsOnEdge: (edge: DockEdge) =>
    Array.from(dockedWindows.values()).filter((window) => window.edge === edge),
  getActiveWindowOnEdge: (edge: DockEdge) => activeWindowsByEdge.get(edge) ?? null,
  getPanelContentHost: () => null,
  isEdgeCollapsed: (edge: DockEdge) => collapsedEdges.has(edge),
  registerWindowConfig: (id: string, config: WindowConfig) => {
    const current = windowConfigs.get(id);
    windowConfigs.set(id, current ? { ...current, ...config } : config);
    notify();
  },
  getWindowConfig: (id: string) => {
    const existing = windowConfigs.get(id);
    if (existing) {
      return existing;
    }

    const fallback: WindowConfig = {
      title: id || "window",
      onDock: noop,
      onUndock: noop,
    };
    windowConfigs.set(id, fallback);
    return fallback;
  },
  registerWindowActions: (id: string, actions?: WindowActions) => {
    if (actions) {
      windowActions.set(id, actions);
    }
  },
  unregisterWindowActions: (id: string) => {
    windowActions.delete(id);
  },
  closeWindow: (id: string) => {
    windowActions.get(id)?.onClose?.();
  },
  requestUndock: (id: string) => {
    windowActions.get(id)?.onUndock?.();
  },
  getWindowZIndex: () => null,
  getPanelZIndex: () => null,
  getPreDockRect: (id: string) => preDockRects.get(id) ?? null,
  ...overrides,
});

// interface MockDockingProviderProps {
//   dockedWindows: Map<string, DockedWindow>;
//   overrides?: Partial<DockingContextType>;
//   children: ReactNode;
// }

/** * DO NOT USE THIS inline DockingContext.Provider in each test */
/** * DO NOT UNCOMMENT THIS COMPONENT IN TESTS */
// /** Hosts a mock docking context and re-renders its consumers whenever the mock state changes */
// export const MockDockingProvider = ({
//   dockedWindows,
//   overrides,
//   children,
// }: MockDockingProviderProps): React.ReactElement => {
//   const [, notify] = useReducer((version: number) => version + 1, 0);
//   const [preDockRects] = useState<Map<string, WindowRect>>(() => new Map());
//   const [collapsedEdges] = useState<Set<DockEdge>>(() => new Set());
//   const [activeWindowsByEdge] = useState<Map<DockEdge, string>>(() => new Map());
//   const [windowConfigs] = useState<Map<string, WindowConfig>>(() => new Map());
//   const [windowActions] = useState<Map<string, WindowActions>>(() => new Map());
//   const value = createMockDocking(
//     dockedWindows,
//     overrides,
//     notify,
//     preDockRects,
//     collapsedEdges,
//     activeWindowsByEdge,
//     windowConfigs,
//     windowActions,
//   );

//   return <DockingContext.Provider value={value}>{children}</DockingContext.Provider>;
// };
