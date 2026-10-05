import { ReactNode, createContext, useCallback, useMemo, useReducer, useRef } from "react";
import { MAX_Z_INDEX, MIN_Z_INDEX } from "../functions/contextWindowConstants";
import { dockingReducer, initialDockingState } from "../reducer";
import { DockPanel } from "./DockPanel";
import { DockZoneIndicator } from "./DockZoneIndicator";
import type {
  DockEdge,
  DockedWindow,
  DockingContextType,
  WindowConfig,
  WindowRect,
} from "./interface";

export const DockingContext = createContext<DockingContextType | undefined>(undefined);
const noop = (): void => undefined;

interface DockingProviderProps {
  children: ReactNode;
  minZIndex?: number;
  maxZIndex?: number;
}

export const DockingProvider = ({
  children,
  minZIndex = MIN_Z_INDEX,
  maxZIndex = MAX_Z_INDEX,
}: DockingProviderProps): React.ReactElement => {
  const [state, dispatch] = useReducer(dockingReducer, initialDockingState);
  const windowActions = useRef(new Map<string, { onClose?: () => void; onUndock?: () => void }>());

  const closeWindow = useCallback((id: string): void => {
    windowActions.current.get(id)?.onClose?.();
  }, []);

  const getWindowConfig = useCallback(
    (id: string): WindowConfig => {
      const existing = state.windowConfigs.get(id);
      if (existing) {
        return existing;
      }

      return {
        title: id || "window",
        onDock: noop,
        onUndock: noop,
      };
    },
    [state.windowConfigs],
  );

  const registerWindowActions = useCallback(
    (id: string, actions?: { onClose?: () => void; onUndock?: () => void }): void => {
      windowActions.current.set(id, actions ?? {});
    },
    [],
  );

  const registerWindowConfig = useCallback((id: string, config: Partial<WindowConfig>): void => {
    dispatch({ type: "registerWindowConfig", id, config });
  }, []);

  const requestUndock = useCallback((id: string): void => {
    windowActions.current.get(id)?.onUndock?.();
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
      maxZIndex,
      minZIndex,
      closeWindow,
      dispatch,
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
      registerWindowActions,
      registerWindowConfig,
      requestUndock,
      unregisterWindowActions,
    };
  }, [
    closeWindow,
    maxZIndex,
    minZIndex,
    dispatch,
    getWindowConfig,
    registerWindowActions,
    registerWindowConfig,
    requestUndock,
    state.activeWindowsByEdge,
    state.collapsedEdges,
    state.dockedWindows,
    state.panelContentHosts,
    state.preDockRects,
    state.zOrder,
    state.zRanges,
    unregisterWindowActions,
  ]);

  return (
    <DockingContext.Provider value={contextValue}>
      {children}
      <DockPanel edge="top" />
      <DockPanel edge="left" />
      <DockPanel edge="right" />
      <DockPanel edge="bottom" />
      {/* One shared overlay: only a single window can be dragged towards an edge at a time */}
      <DockZoneIndicator
        targetEdge={state.dragSnapEdge}
        isDragging={state.dragWindowId !== null}
      />
    </DockingContext.Provider>
  );
};
