import { MAX_Z_INDEX, MIN_Z_INDEX } from "../../functions/contextWindowConstants";
import type {
  DockEdge,
  DockedWindow,
  DockingContextType,
  DockingWindowController,
  WindowConfig,
  WindowRect,
} from "../interface";

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
  windowControllers: Map<string, DockingWindowController> = new Map(),
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
  showWindowById: () => {},
  getPanelContentHost: () => null,
  isEdgeCollapsed: (edge: DockEdge) => collapsedEdges.has(edge),
  registerWindowConfig: (id: string, config: Partial<WindowConfig>) => {
    const current = windowConfigs.get(id);
    windowConfigs.set(id, current ? { ...current, ...config } : { title: id, ...config });
    notify();
  },
  getWindowConfig: (id: string) => {
    const existing = windowConfigs.get(id);
    if (existing) {
      return existing;
    }

    const fallback: WindowConfig = {
      title: id || "window",
    };
    windowConfigs.set(id, fallback);
    return fallback;
  },
  getWindowController: (id: string) => windowControllers.get(id),
  registerWindowController: (id: string, controller: DockingWindowController) => {
    windowControllers.set(id, controller);
  },
  unregisterWindowController: (id: string) => {
    windowControllers.delete(id);
  },
  closeWindow: (id: string) => {
    windowControllers.get(id)?.onClose?.();
  },
  getWindowZIndex: () => 0,
  getPanelZIndex: () => null,
  getPreDockRect: (id: string) => preDockRects.get(id) ?? null,
  ...overrides,
});
