import { ReactNode, useReducer, useState } from "react";
import { DockingContext } from "../DockingContext";
import type { DockEdge, DockedWindow, DockingContextType, WindowRect } from "../interface";

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
): DockingContextType => ({
  dock: (id: string, edge: DockEdge, preDockRect?: WindowRect | null) => {
    if (preDockRect && !preDockRects.has(id)) {
      preDockRects.set(id, preDockRect);
    }
    dockedWindows.set(id, { id, edge, order: 0 });
    notify();
  },
  undock: (id: string, options?: { viaDrag?: boolean }) => {
    dockedWindows.delete(id);
    if (!options?.viaDrag) {
      preDockRects.delete(id);
    }
    notify();
  },
  getDockedWindow: (id: string) => dockedWindows.get(id),
  getWindowsOnEdge: (edge: DockEdge) =>
    Array.from(dockedWindows.values()).filter((window) => window.edge === edge),
  setActiveWindowOnEdge: () => {},
  getActiveWindowOnEdge: () => null,
  setPanelContentHost: () => {},
  getPanelContentHost: () => null,
  isEdgeCollapsed: () => false,
  toggleEdgeCollapse: () => {},
  registerWindow: () => {},
  unregisterWindow: () => {},
  raiseWindow: () => {},
  getWindowZIndex: () => null,
  getPanelZIndex: () => null,
  getPreDockRect: (id: string) => preDockRects.get(id) ?? null,
  startDockDrag: () => {},
  setDockDragEdge: () => {},
  endDockDrag: () => {},
  ...overrides,
});

interface MockDockingProviderProps {
  dockedWindows: Map<string, DockedWindow>;
  overrides?: Partial<DockingContextType>;
  children: ReactNode;
}

/** Hosts a mock docking context and re-renders its consumers whenever the mock state changes */
export const MockDockingProvider = ({
  dockedWindows,
  overrides,
  children,
}: MockDockingProviderProps): React.ReactElement => {
  const [, notify] = useReducer((version: number) => version + 1, 0);
  const [preDockRects] = useState<Map<string, WindowRect>>(() => new Map());
  const value = createMockDocking(dockedWindows, overrides, notify, preDockRects);

  return <DockingContext.Provider value={value}>{children}</DockingContext.Provider>;
};
