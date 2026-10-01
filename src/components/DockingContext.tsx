import { ReactNode, createContext, useCallback, useState } from "react";
import type {
  DockEdge,
  DockedWindow,
  DockingContextType,
  DockingState,
  StackDirection,
} from "./interface";

export const DockingContext = createContext<DockingContextType | undefined>(undefined);

interface DockingProviderProps {
  children: ReactNode;
}

export const DockingProvider = ({ children }: DockingProviderProps): React.ReactElement => {
  const [state, setState] = useState<DockingState>({
    dockedWindows: new Map(),
    collapsedEdges: new Set(),
  });
  const [activeWindowsByEdge, setActiveWindowsByEdge] = useState<Map<DockEdge, string>>(new Map());
  const [panelContentHosts, setPanelContentHosts] = useState<Map<DockEdge, HTMLDivElement>>(
    new Map(),
  );
  const [panelZIndexes, setPanelZIndexes] = useState<Map<DockEdge, number>>(new Map());
  // Incremented whenever a window is explicitly activated so it can bring itself to the front
  const [activationCounts, setActivationCounts] = useState<Map<string, number>>(new Map());

  const bumpActivation = useCallback((id: string): void => {
    setActivationCounts((prevActivationCounts) => {
      const nextActivationCounts = new Map(prevActivationCounts);
      nextActivationCounts.set(id, (prevActivationCounts.get(id) ?? 0) + 1);
      return nextActivationCounts;
    });
  }, []);

  const dock = useCallback(
    (id: string, edge: DockEdge, stackDirection: StackDirection): void => {
      setState((prevState) => {
        const newState = {
          ...prevState,
          dockedWindows: new Map(prevState.dockedWindows),
        };

        // Get the current order for this edge
        const windowsOnEdge = Array.from(newState.dockedWindows.values()).filter(
          (w) => w.edge === edge,
        );
        const nextOrder = Math.max(...windowsOnEdge.map((w) => w.order), -1) + 1;

        newState.dockedWindows.set(id, {
          id,
          edge,
          stackDirection,
          isCollapsed: false,
          order: nextOrder,
        });

        return newState;
      });
      setActiveWindowsByEdge((prevActiveWindowsByEdge) => {
        const nextActiveWindowsByEdge = new Map(prevActiveWindowsByEdge);
        nextActiveWindowsByEdge.set(edge, id);
        return nextActiveWindowsByEdge;
      });
      // Docking a window shows it, so a pinned (contents hidden) edge is unpinned
      setState((prevState) => {
        if (!prevState.collapsedEdges.has(edge)) {
          return prevState;
        }
        const nextCollapsedEdges = new Set(prevState.collapsedEdges);
        nextCollapsedEdges.delete(edge);
        return { ...prevState, collapsedEdges: nextCollapsedEdges };
      });
      bumpActivation(id);
    },
    [bumpActivation],
  );

  const undock = useCallback((id: string): void => {
    setState((prevState): DockingState => {
      const newState = {
        ...prevState,
        dockedWindows: new Map(prevState.dockedWindows),
      };
      const removedWindow = newState.dockedWindows.get(id);
      newState.dockedWindows.delete(id);

      if (!removedWindow) {
        return prevState;
      }
      const edgeIsEmpty = !Array.from(newState.dockedWindows.values()).some(
        (window) => window.edge === removedWindow.edge,
      );
      // An empty edge has no panel, so drop its pinned state
      if (edgeIsEmpty && newState.collapsedEdges.has(removedWindow.edge)) {
        const nextCollapsedEdges = new Set(newState.collapsedEdges);
        nextCollapsedEdges.delete(removedWindow.edge);
        return { ...newState, collapsedEdges: nextCollapsedEdges };
      }

      return newState;
    });
  }, []);

  const toggleCollapse = useCallback((id: string): void => {
    setState((prevState) => {
      const newState = {
        ...prevState,
        dockedWindows: new Map(prevState.dockedWindows),
      };

      const window = newState.dockedWindows.get(id);
      if (window) {
        newState.dockedWindows.set(id, {
          ...window,
          isCollapsed: !window.isCollapsed,
        });
      }

      return newState;
    });
  }, []);

  const getDockedWindow = useCallback(
    (id: string): DockedWindow | undefined => state.dockedWindows.get(id),
    [state.dockedWindows],
  );

  const getWindowsOnEdge = useCallback(
    (edge: DockEdge): DockedWindow[] => {
      return Array.from(state.dockedWindows.values())
        .filter((w) => w.edge === edge)
        .sort((a, b) => a.order - b.order);
    },
    [state.dockedWindows],
  );

  const isEdgeCollapsed = useCallback(
    (edge: DockEdge): boolean => {
      return state.collapsedEdges.has(edge);
    },
    [state.collapsedEdges],
  );

  const toggleEdgeCollapse = useCallback((edge: DockEdge): void => {
    setState((prevState) => {
      const newCollapsedEdges = new Set(prevState.collapsedEdges);
      if (newCollapsedEdges.has(edge)) {
        newCollapsedEdges.delete(edge);
      } else {
        newCollapsedEdges.add(edge);
      }
      return {
        ...prevState,
        collapsedEdges: newCollapsedEdges,
      };
    });
  }, []);

  const setActiveWindowOnEdge = useCallback(
    (edge: DockEdge, id: string): void => {
      setActiveWindowsByEdge((prevActiveWindowsByEdge) => {
        if (prevActiveWindowsByEdge.get(edge) === id) {
          return prevActiveWindowsByEdge;
        }
        const nextActiveWindowsByEdge = new Map(prevActiveWindowsByEdge);
        nextActiveWindowsByEdge.set(edge, id);
        return nextActiveWindowsByEdge;
      });
      bumpActivation(id);
    },
    [bumpActivation],
  );

  const getWindowActivationCount = useCallback(
    (id: string): number => {
      return activationCounts.get(id) ?? 0;
    },
    [activationCounts],
  );

  const getActiveWindowOnEdge = useCallback(
    (edge: DockEdge): string | null => {
      const activeId = activeWindowsByEdge.get(edge);
      if (activeId && state.dockedWindows.get(activeId)?.edge === edge) {
        return activeId;
      }
      // The active window has left this edge: the first remaining window takes over (without an
      // activation bump, so it is not raised)
      let first: DockedWindow | null = null;
      state.dockedWindows.forEach((window) => {
        if (window.edge === edge && (!first || window.order < first.order)) {
          first = window;
        }
      });
      return (first as DockedWindow | null)?.id ?? null;
    },
    [activeWindowsByEdge, state.dockedWindows],
  );

  const setPanelContentHost = useCallback((edge: DockEdge, host: HTMLDivElement | null): void => {
    setPanelContentHosts((prevPanelContentHosts) => {
      const currentHost = prevPanelContentHosts.get(edge) ?? null;
      if (currentHost === host) {
        return prevPanelContentHosts;
      }

      const nextPanelContentHosts = new Map(prevPanelContentHosts);
      if (host) {
        nextPanelContentHosts.set(edge, host);
      } else {
        nextPanelContentHosts.delete(edge);
      }
      return nextPanelContentHosts;
    });
  }, []);

  const getPanelContentHost = useCallback(
    (edge: DockEdge): HTMLDivElement | null => {
      return panelContentHosts.get(edge) ?? null;
    },
    [panelContentHosts],
  );

  const setPanelZIndex = useCallback((edge: DockEdge, zIndex: number | null): void => {
    setPanelZIndexes((prevPanelZIndexes) => {
      if ((prevPanelZIndexes.get(edge) ?? null) === zIndex) {
        return prevPanelZIndexes;
      }
      const nextPanelZIndexes = new Map(prevPanelZIndexes);
      if (zIndex === null) {
        nextPanelZIndexes.delete(edge);
      } else {
        nextPanelZIndexes.set(edge, zIndex);
      }
      return nextPanelZIndexes;
    });
  }, []);

  const getPanelZIndex = useCallback(
    (edge: DockEdge): number | null => {
      const edgeHasWindows = Array.from(state.dockedWindows.values()).some(
        (window) => window.edge === edge,
      );
      return edgeHasWindows ? (panelZIndexes.get(edge) ?? null) : null;
    },
    [panelZIndexes, state.dockedWindows],
  );

  const contextValue: DockingContextType = {
    state,
    dock,
    undock,
    toggleCollapse,
    setActiveWindowOnEdge,
    getActiveWindowOnEdge,
    setPanelContentHost,
    getPanelContentHost,
    setPanelZIndex,
    getPanelZIndex,
    getWindowActivationCount,
    getDockedWindow,
    getWindowsOnEdge,
    isEdgeCollapsed,
    toggleEdgeCollapse,
  };

  return <DockingContext.Provider value={contextValue}>{children}</DockingContext.Provider>;
};
