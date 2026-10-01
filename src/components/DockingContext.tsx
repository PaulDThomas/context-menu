import { ReactNode, createContext, useCallback, useMemo, useReducer } from "react";
import { DockZoneIndicator } from "./DockZoneIndicator";
import { dockingReducer, initialDockingState } from "./dockingReducer";
import type {
  DockEdge,
  DockedWindow,
  DockingContextType,
  WindowRect,
  WindowZRange,
} from "./interface";

export const DockingContext = createContext<DockingContextType | undefined>(undefined);

interface DockingProviderProps {
  children: ReactNode;
}

export const DockingProvider = ({ children }: DockingProviderProps): React.ReactElement => {
  const [state, dispatch] = useReducer(dockingReducer, initialDockingState);

  const dock = useCallback((id: string, edge: DockEdge, preDockRect?: WindowRect | null): void => {
    dispatch({ type: "dock", id, edge, preDockRect });
  }, []);

  const undock = useCallback((id: string, options?: { viaDrag?: boolean }): void => {
    dispatch({ type: "undock", id, viaDrag: options?.viaDrag });
  }, []);

  const setActiveWindowOnEdge = useCallback((edge: DockEdge, id: string): void => {
    dispatch({ type: "setActiveWindowOnEdge", edge, id });
  }, []);

  const setPanelContentHost = useCallback((edge: DockEdge, host: HTMLDivElement | null): void => {
    dispatch({ type: "setPanelContentHost", edge, host });
  }, []);

  const toggleEdgeCollapse = useCallback((edge: DockEdge): void => {
    dispatch({ type: "toggleEdgeCollapse", edge });
  }, []);

  const registerWindow = useCallback((id: string, zRange: WindowZRange): void => {
    dispatch({ type: "registerWindow", id, zRange });
  }, []);

  const unregisterWindow = useCallback((id: string): void => {
    dispatch({ type: "unregisterWindow", id });
  }, []);

  const raiseWindow = useCallback((id: string): void => {
    dispatch({ type: "raiseWindow", id });
  }, []);

  const startDockDrag = useCallback((id: string): void => {
    dispatch({ type: "startDockDrag", id });
  }, []);

  const setDockDragEdge = useCallback((edge: DockEdge | null): void => {
    dispatch({ type: "setDockDragEdge", edge });
  }, []);

  const endDockDrag = useCallback((id: string): void => {
    dispatch({ type: "endDockDrag", id });
  }, []);

  const contextValue = useMemo<DockingContextType>(() => {
    const getDockedWindow = (id: string): DockedWindow | undefined => state.dockedWindows.get(id);

    const getWindowsOnEdge = (edge: DockEdge): DockedWindow[] =>
      Array.from(state.dockedWindows.values())
        .filter((window) => window.edge === edge)
        .sort((a, b) => a.order - b.order);

    const getActiveWindowOnEdge = (edge: DockEdge): string | null => {
      const activeId = state.activeWindowsByEdge.get(edge);
      if (activeId && state.dockedWindows.get(activeId)?.edge === edge) {
        return activeId;
      }
      // The active window has left this edge, so the first remaining window takes over
      return getWindowsOnEdge(edge)[0]?.id ?? null;
    };

    const getWindowZIndex = (id: string): number | null => {
      const index = state.zOrder.indexOf(id);
      const zRange = state.zRanges.get(id);
      if (index === -1 || !zRange) {
        return null;
      }
      // More windows than the available range simply share the top slot
      return Math.min(zRange.maxZIndex, zRange.minZIndex + index);
    };

    return {
      dock,
      undock,
      getDockedWindow,
      getWindowsOnEdge,
      setActiveWindowOnEdge,
      getActiveWindowOnEdge,
      setPanelContentHost,
      getPanelContentHost: (edge: DockEdge): HTMLDivElement | null =>
        state.panelContentHosts.get(edge) ?? null,
      isEdgeCollapsed: (edge: DockEdge): boolean => state.collapsedEdges.has(edge),
      toggleEdgeCollapse,
      registerWindow,
      unregisterWindow,
      raiseWindow,
      getWindowZIndex,
      getPanelZIndex: (edge: DockEdge): number | null => {
        const activeId = getActiveWindowOnEdge(edge);
        return activeId ? getWindowZIndex(activeId) : null;
      },
      getPreDockRect: (id: string): WindowRect | null => state.preDockRects.get(id) ?? null,
      startDockDrag,
      setDockDragEdge,
      endDockDrag,
    };
  }, [
    state,
    dock,
    undock,
    setActiveWindowOnEdge,
    setPanelContentHost,
    toggleEdgeCollapse,
    registerWindow,
    unregisterWindow,
    raiseWindow,
    startDockDrag,
    setDockDragEdge,
    endDockDrag,
  ]);

  return (
    <DockingContext.Provider value={contextValue}>
      {children}
      {/* One shared overlay: only a single window can be dragged towards an edge at a time */}
      <DockZoneIndicator
        targetEdge={state.dragSnapEdge}
        isDragging={state.dragWindowId !== null}
      />
    </DockingContext.Provider>
  );
};
