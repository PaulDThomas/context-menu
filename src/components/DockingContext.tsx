import {
  ReactNode,
  createContext,
  useCallback,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
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

const shouldNotifyWindowConfigUpdate = (left: WindowConfig, right: WindowConfig): boolean =>
  left.title !== right.title ||
  left.titleElement !== right.titleElement ||
  left.windowInDOM !== right.windowInDOM ||
  left.windowVisible !== right.windowVisible ||
  left.moving !== right.moving ||
  left.dockable !== right.dockable ||
  left.allowUndock !== right.allowUndock ||
  left.initialDockEdge !== right.initialDockEdge;

export const DockingProvider = ({ children }: DockingProviderProps): React.ReactElement => {
  const [state, dispatch] = useReducer(dockingReducer, initialDockingState);
  const windowActions = useRef(new Map<string, { onClose?: () => void; onUndock?: () => void }>());
  const windowConfigs = useRef(new Map<string, WindowConfig>());
  const [windowConfigVersion, setWindowConfigVersion] = useState<number>(0);

  const activateWindowOnEdge = useCallback((edge: DockEdge, id?: string): void => {
    dispatch({ type: "activateWindowOnEdge", edge, id });
  }, []);

  const closeWindow = useCallback((id: string): void => {
    windowActions.current.get(id)?.onClose?.();
  }, []);

  const dock = useCallback((id: string, edge: DockEdge, preDockRect?: WindowRect | null): void => {
    dispatch({ type: "dock", id, edge, preDockRect });
  }, []);

  const endDockDrag = useCallback((id: string): void => {
    dispatch({ type: "endDockDrag", id });
  }, []);

  const getWindowConfig = useCallback((id: string): WindowConfig => {
    const existing = windowConfigs.current.get(id);
    if (existing) {
      return existing;
    }

    return { title: id || "window", windowInDOM: false, windowVisible: false, moving: false };
  }, []);

  const raiseWindow = useCallback((id: string): void => {
    dispatch({ type: "raiseWindow", id });
  }, []);

  const registerWindow = useCallback((id: string, zRange: WindowZRange): void => {
    dispatch({ type: "registerWindow", id, zRange });
  }, []);

  const registerWindowActions = useCallback(
    (id: string, actions?: { onClose?: () => void; onUndock?: () => void }): void => {
      windowActions.current.set(id, actions ?? {});
    },
    [],
  );

  const registerWindowConfig = useCallback((id: string, config: WindowConfig): void => {
    const current = windowConfigs.current.get(id);
    const nextConfig = current ? { ...current, ...config } : config;
    windowConfigs.current.set(id, nextConfig);
    if (!current || shouldNotifyWindowConfigUpdate(current, nextConfig)) {
      setWindowConfigVersion((version) => version + 1);
    }
  }, []);

  const requestUndock = useCallback((id: string): void => {
    windowActions.current.get(id)?.onUndock?.();
  }, []);

  const setActiveWindowOnEdge = useCallback((edge: DockEdge, id: string): void => {
    dispatch({ type: "setActiveWindowOnEdge", edge, id });
  }, []);

  const setDockDragEdge = useCallback((edge: DockEdge | null): void => {
    dispatch({ type: "setDockDragEdge", edge });
  }, []);

  const setPanelContentHost = useCallback((edge: DockEdge, host: HTMLDivElement | null): void => {
    dispatch({ type: "setPanelContentHost", edge, host });
  }, []);

  const startDockDrag = useCallback((id: string): void => {
    dispatch({ type: "startDockDrag", id });
  }, []);

  const toggleAndRaiseEdge = useCallback((edge: DockEdge): void => {
    dispatch({ type: "toggleAndRaiseEdge", edge });
  }, []);

  const toggleEdgeCollapse = useCallback((edge: DockEdge): void => {
    dispatch({ type: "toggleEdgeCollapse", edge });
  }, []);

  const undock = useCallback((id: string, options?: { viaDrag?: boolean }): void => {
    dispatch({ type: "undock", id, viaDrag: options?.viaDrag });
  }, []);

  const unregisterWindow = useCallback((id: string): void => {
    dispatch({ type: "unregisterWindow", id });
  }, []);

  const unregisterWindowActions = useCallback((id: string): void => {
    windowActions.current.delete(id);
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
      activateWindowOnEdge,
      closeWindow,
      dock,
      endDockDrag,
      getActiveWindowOnEdge,
      getDockedWindow,
      getPanelContentHost: (edge: DockEdge): HTMLDivElement | null =>
        state.panelContentHosts.get(edge) ?? null,
      getPanelZIndex: (edge: DockEdge): number | null => {
        const activeId = getActiveWindowOnEdge(edge);
        return activeId ? getWindowZIndex(activeId) : null;
      },
      getPreDockRect: (id: string): WindowRect | null => state.preDockRects.get(id) ?? null,
      getWindowConfig,
      getWindowZIndex,
      getWindowsOnEdge,
      isEdgeCollapsed: (edge: DockEdge): boolean => state.collapsedEdges.has(edge),
      raiseWindow,
      registerWindow,
      registerWindowActions,
      registerWindowConfig,
      requestUndock,
      setActiveWindowOnEdge,
      setDockDragEdge,
      setPanelContentHost,
      startDockDrag,
      toggleAndRaiseEdge,
      toggleEdgeCollapse,
      undock,
      unregisterWindow,
      unregisterWindowActions,
    };
  }, [
    activateWindowOnEdge,
    closeWindow,
    dock,
    endDockDrag,
    getWindowConfig,
    raiseWindow,
    registerWindow,
    registerWindowActions,
    registerWindowConfig,
    requestUndock,
    setActiveWindowOnEdge,
    setDockDragEdge,
    setPanelContentHost,
    startDockDrag,
    state.activeWindowsByEdge,
    state.collapsedEdges,
    state.dockedWindows,
    state.panelContentHosts,
    state.preDockRects,
    state.zOrder,
    state.zRanges,
    toggleAndRaiseEdge,
    toggleEdgeCollapse,
    undock,
    unregisterWindow,
    unregisterWindowActions,
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
