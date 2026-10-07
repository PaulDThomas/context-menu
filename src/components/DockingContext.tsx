import {
  ReactNode,
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { MAX_Z_INDEX, MIN_Z_INDEX } from "../functions/contextWindowConstants";
import { dockingReducer, initialDockingState } from "../reducer";
import { DockPanel, type DockPanelSettings } from "./DockPanel";
import { DockZoneIndicator } from "./DockZoneIndicator";
import type {
  DockEdge,
  DockedWindow,
  DockingContextType,
  DockingWindowController,
  WindowConfig,
  WindowRect,
} from "./interface";

export const DockingContext = createContext<DockingContextType | undefined>(undefined);

const PANEL_SETTINGS_KEY = "@asup/context-menu:dock-panels";
const DOCK_EDGES: DockEdge[] = ["top", "left", "right", "bottom"];

const readPanelSettings = (): Record<DockEdge, DockPanelSettings> => {
  const settings: Record<DockEdge, DockPanelSettings> = {
    top: { size: null, pushContent: false },
    left: { size: null, pushContent: false },
    right: { size: null, pushContent: false },
    bottom: { size: null, pushContent: false },
  };
  if (typeof window === "undefined") {
    return settings;
  }

  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(PANEL_SETTINGS_KEY) ?? "null");
    if (typeof saved !== "object" || saved === null || Array.isArray(saved)) {
      return settings;
    }
    for (const edge of DOCK_EDGES) {
      const panel: unknown = (saved as Record<string, unknown>)[edge];
      if (typeof panel !== "object" || panel === null || Array.isArray(panel)) {
        continue;
      }
      const { size, pushContent } = panel as Record<string, unknown>;
      settings[edge] = {
        size: typeof size === "number" && Number.isFinite(size) && size > 0 ? size : null,
        pushContent: typeof pushContent === "boolean" ? pushContent : false,
      };
    }
  } catch {
    return settings;
  }
  return settings;
};

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
  const [panelSettings, setPanelSettings] = useState(readPanelSettings);
  const savedPanelSettings = useRef(panelSettings);
  const windowControllers = useRef(new Map<string, DockingWindowController>());

  const updatePanelSettings = useCallback((edge: DockEdge, settings: DockPanelSettings): void => {
    setPanelSettings((previous) => {
      const current = previous[edge];
      return current.size === settings.size && current.pushContent === settings.pushContent
        ? previous
        : { ...previous, [edge]: settings };
    });
  }, []);

  useEffect(() => {
    if (savedPanelSettings.current === panelSettings) {
      return;
    }
    savedPanelSettings.current = panelSettings;
    try {
      window.localStorage.setItem(PANEL_SETTINGS_KEY, JSON.stringify(panelSettings));
    } catch {
      return;
    }
  }, [panelSettings]);

  const closeWindow = useCallback((id: string): void => {
    windowControllers.current.get(id)?.onClose?.();
  }, []);

  const getWindowConfig = useCallback(
    (id: string): WindowConfig => {
      const existing = state.windowConfigs.get(id);
      if (existing) {
        return existing;
      }

      return {
        title: id || "window",
      };
    },
    [state.windowConfigs],
  );

  const registerWindowController = useCallback(
    (id: string, controller: DockingWindowController): void => {
      windowControllers.current.set(id, controller);
    },
    [],
  );

  const registerWindowConfig = useCallback((id: string, config: Partial<WindowConfig>): void => {
    dispatch({ type: "registerWindowConfig", id, config });
  }, []);

  const unregisterWindowController = useCallback((id: string): void => {
    windowControllers.current.delete(id);
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

    const getWindowZIndex = (id: string): number => {
      const index = state.zOrder.indexOf(id);
      if (index === -1) {
        return minZIndex;
      }
      // More windows than the available range simply share the top slot
      return Math.min(maxZIndex, minZIndex + index);
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
      getWindowController: (id: string): DockingWindowController | undefined =>
        windowControllers.current.get(id),
      getWindowZIndex,
      getWindowsOnEdge,
      isEdgeCollapsed: (edge: DockEdge): boolean => state.collapsedEdges.has(edge),
      registerWindowController,
      registerWindowConfig,
      unregisterWindowController,
    };
  }, [
    closeWindow,
    maxZIndex,
    minZIndex,
    dispatch,
    getWindowConfig,
    registerWindowController,
    registerWindowConfig,
    state.activeWindowsByEdge,
    state.collapsedEdges,
    state.dockedWindows,
    state.panelContentHosts,
    state.preDockRects,
    state.zOrder,
    unregisterWindowController,
  ]);

  return (
    <DockingContext.Provider value={contextValue}>
      {children}
      {DOCK_EDGES.map((edge) => (
        <DockPanel
          key={edge}
          edge={edge}
          initialSettings={panelSettings[edge]}
          onSettingsChange={updatePanelSettings}
        />
      ))}
      {/* One shared overlay: only a single window can be dragged towards an edge at a time */}
      <DockZoneIndicator
        targetEdge={state.dragSnapEdge}
        isDragging={state.dragWindowId !== null}
      />
    </DockingContext.Provider>
  );
};
