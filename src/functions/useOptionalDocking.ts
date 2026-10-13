import { useContext, useMemo } from "react";
import { DockingContext } from "../components/DockingContext";
import type {
  DockEdge,
  DockedWindow,
  DockingContextType,
  DockingWindowController,
  WindowConfig,
  WindowRect,
} from "../components/interface";

export const useOptionalDocking = (): DockingContextType | undefined => {
  const context = useContext(DockingContext);

  return useMemo(() => {
    if (!context) {
      return undefined;
    }
    const { dispatch, maxZIndex, minZIndex, state, windowControllers } = context;

    const closeWindow = (id: string): void => windowControllers.current.get(id)?.onClose?.();

    const getActiveWindowOnEdge = (edge: DockEdge): string | null => {
      const activeId = state.activeWindowsByEdge.get(edge);
      if (activeId && state.dockedWindows.get(activeId)?.edge === edge) {
        return activeId;
      }
      return getWindowsOnEdge(edge)[0]?.id ?? null;
    };

    const getDockedWindow = (id: string): DockedWindow | undefined => state.dockedWindows.get(id);
    const getPanelContentHost = (edge: DockEdge): HTMLDivElement | null =>
      state.panelContentHosts.get(edge) ?? null;
    const getPanelZIndex = (edge: DockEdge): number | null => {
      const activeId = getActiveWindowOnEdge(edge);
      return activeId ? getWindowZIndex(activeId) : null;
    };
    const getPreDockRect = (id: string): WindowRect | null => state.preDockRects.get(id) ?? null;
    const getWindowConfig = (id: string): WindowConfig =>
      state.windowConfigs.get(id) ?? { title: id || "window" };
    const getWindowController = (id: string): DockingWindowController | undefined =>
      windowControllers.current.get(id);
    const getWindowsOnEdge = (edge: DockEdge): DockedWindow[] =>
      Array.from(state.dockedWindows.values())
        .filter((window) => window.edge === edge)
        .sort((windowA, windowB) => windowA.order - windowB.order);
    const getWindowZIndex = (id: string): number => {
      const index = state.zOrder.indexOf(id);
      if (index === -1) {
        return minZIndex;
      }
      return Math.min(maxZIndex, minZIndex + index);
    };
    const isEdgeCollapsed = (edge: DockEdge): boolean => state.collapsedEdges.has(edge);
    const registerWindowConfig = (id: string, config: Partial<WindowConfig>): void => {
      dispatch({ type: "registerWindowConfig", id, config });
    };
    const registerWindowController = (id: string, controller: DockingWindowController): void => {
      windowControllers.current.set(id, controller);
    };
    const showWindowById = (id: string): void => {
      if (state.zOrder.includes(id)) {
        dispatch({ type: "raiseWindow", id });
      }
    };
    const unregisterWindowController = (id: string): void => {
      windowControllers.current.delete(id);
    };

    return {
      maxZIndex,
      minZIndex,
      dispatch,
      closeWindow,
      getActiveWindowOnEdge,
      getDockedWindow,
      showWindowById,
      getPanelContentHost,
      getPanelZIndex,
      getPreDockRect,
      getWindowConfig,
      getWindowController,
      getWindowZIndex,
      getWindowsOnEdge,
      isEdgeCollapsed,
      registerWindowConfig,
      registerWindowController,
      unregisterWindowController,
    };
  }, [context]);
};
