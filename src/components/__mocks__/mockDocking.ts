import { initialDockingState, type DockingState } from "../../reducer";
import type { DockingContextType } from "../interface";

export const createDockingMock = (
  state: DockingState = initialDockingState,
  overrides: Partial<DockingContextType> = {},
): DockingContextType => {
  const getWindowsOnEdge: DockingContextType["getWindowsOnEdge"] = (edge) =>
    Array.from(state.dockedWindows.values())
      .filter((window) => window.edge === edge)
      .sort((windowA, windowB) => windowA.order - windowB.order);

  return {
    maxZIndex: 3100,
    minZIndex: 3000,
    dispatch: vi.fn(),
    closeWindow: vi.fn(),
    getActiveWindowOnEdge: (edge) => {
      const activeId = state.activeWindowsByEdge.get(edge);
      if (activeId && state.dockedWindows.get(activeId)?.edge === edge) {
        return activeId;
      }
      return getWindowsOnEdge(edge)[0]?.id ?? null;
    },
    showWindowById: vi.fn(),
    getDockedWindow: (id) => state.dockedWindows.get(id),
    getWindowConfig: (id) => state.windowConfigs.get(id) ?? { title: id || "window" },
    getWindowController: () => undefined,
    getPanelContentHost: (edge) => state.panelContentHosts.get(edge) ?? null,
    getPanelZIndex: () => null,
    getPreDockRect: (id) => state.preDockRects.get(id) ?? null,
    getWindowsOnEdge,
    getWindowZIndex: () => 3000,
    isEdgeCollapsed: (edge) => state.collapsedEdges.has(edge),
    registerWindowController: vi.fn(),
    registerWindowConfig: vi.fn(),
    unregisterWindowController: vi.fn(),
    ...overrides,
  };
};

export const defaultDocking = createDockingMock();
