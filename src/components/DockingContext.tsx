import { ReactNode, createContext, useCallback, useMemo, useReducer, useRef } from "react";
import { dockingReducer, initialDockingState } from "../reducer";
import { DockZoneIndicator } from "./DockZoneIndicator";
import type {
  DockEdge,
  DockedWindow,
  DockingContextType,
  WindowConfig,
  WindowRect,
  WindowZRange,
} from "./interface";

export const DockingContext = createContext<DockingContextType | undefined>(undefined);

interface DockingProviderProps {
  children: ReactNode;
}

export const DockingProvider = ({ children }: DockingProviderProps): React.ReactElement => {
  const [state, dispatch] = useReducer(dockingReducer, initialDockingState);
  const windowActions = useRef(new Map<string, { onClose?: () => void; onUndock?: () => void }>());
  const windowConfigs = useRef(new Map<string, WindowConfig>());

  const dock = useCallback((id: string, edge: DockEdge, preDockRect?: WindowRect | null): void => {
    dispatch({ type: "dock", id, edge, preDockRect });
  }, []);

  const undock = useCallback((id: string, options?: { viaDrag?: boolean }): void => {
    dispatch({ type: "undock", id, viaDrag: options?.viaDrag });
  }, []);

  const setActiveWindowOnEdge = useCallback((edge: DockEdge, id: string): void => {
    dispatch({ type: "setActiveWindowOnEdge", edge, id });
  }, []);

  const activateWindowOnEdge = useCallback((edge: DockEdge, id?: string): void => {
    dispatch({ type: "activateWindowOnEdge", edge, id });
  }, []);

  const toggleAndRaiseEdge = useCallback((edge: DockEdge): void => {
    dispatch({ type: "toggleAndRaiseEdge", edge });
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

  const registerWindowConfig = useCallback((id: string, config: WindowConfig): void => {
    windowConfigs.current.set(id, config);
  }, []);

  const getWindowConfig = useCallback((id: string): WindowConfig | undefined => {
    return windowConfigs.current.get(id);
  }, []);

  const registerWindowActions = useCallback(
    (id: string, actions?: { onClose?: () => void; onUndock?: () => void }): void => {
      windowActions.current.set(id, actions ?? {});
    },
    [],
  );
  const unregisterWindowActions = useCallback((id: string): void => {
    windowActions.current.delete(id);
  }, []);
  const closeWindow = useCallback((id: string): void => {
    windowActions.current.get(id)?.onClose?.();
  }, []);
  const requestUndock = useCallback((id: string): void => {
    windowActions.current.get(id)?.onUndock?.();
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
      activateWindowOnEdge,
      getActiveWindowOnEdge,
      toggleAndRaiseEdge,
      setPanelContentHost,
      getPanelContentHost: (edge: DockEdge): HTMLDivElement | null =>
        state.panelContentHosts.get(edge) ?? null,
      isEdgeCollapsed: (edge: DockEdge): boolean => state.collapsedEdges.has(edge),
      toggleEdgeCollapse,
      registerWindow,
      unregisterWindow,
      registerWindowConfig,
      getWindowConfig,
      registerWindowActions,
      unregisterWindowActions,
      closeWindow,
      requestUndock,
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
    activateWindowOnEdge,
    toggleAndRaiseEdge,
    setPanelContentHost,
    toggleEdgeCollapse,
    registerWindow,
    unregisterWindow,
    registerWindowConfig,
    getWindowConfig,
    registerWindowActions,
    unregisterWindowActions,
    closeWindow,
    requestUndock,
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
