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

  const dock = useCallback((id: string, edge: DockEdge, stackDirection: StackDirection): void => {
    console.log("🔵 DockingContext.dock called:", { id, edge, stackDirection });
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

      console.log("🔵 DockingContext.dock - state updated:", {
        id,
        allDockedWindows: Array.from(newState.dockedWindows.keys()),
      });

      return newState;
    });
    setActiveWindowsByEdge((prevActiveWindowsByEdge) => {
      const nextActiveWindowsByEdge = new Map(prevActiveWindowsByEdge);
      nextActiveWindowsByEdge.set(edge, id);
      return nextActiveWindowsByEdge;
    });
  }, []);

  const undock = useCallback(
    (id: string): void => {
      console.log("🟠 DockingContext.undock called:", { id });
      let removedEdge: DockEdge | null = null;
      let nextWindowOnEdgeId: string | null = null;
      let removedWindowWasActive = false;

      setState((prevState): DockingState => {
        const newState = {
          ...prevState,
          dockedWindows: new Map(prevState.dockedWindows),
        };
        const removedWindow = newState.dockedWindows.get(id);
        newState.dockedWindows.delete(id);
        console.log("🟠 DockingContext.undock - state updated:", {
          id,
          allDockedWindows: Array.from(newState.dockedWindows.keys()),
        });

        if (removedWindow) {
          removedEdge = removedWindow.edge;
          const nextWindowOnEdge = Array.from(newState.dockedWindows.values())
            .filter((window) => window.edge === removedWindow.edge)
            .sort((a, b) => a.order - b.order)[0];
          nextWindowOnEdgeId = nextWindowOnEdge ? nextWindowOnEdge.id : null;
          removedWindowWasActive = activeWindowsByEdge.get(removedWindow.edge) === id;
        }

        return newState;
      });
      if (removedEdge !== null && removedWindowWasActive) {
        setActiveWindowsByEdge((prevActiveWindowsByEdge) => {
          const nextActiveWindowsByEdge = new Map(prevActiveWindowsByEdge);
          if (nextWindowOnEdgeId) {
            nextActiveWindowsByEdge.set(removedEdge!, nextWindowOnEdgeId);
          } else {
            nextActiveWindowsByEdge.delete(removedEdge!);
          }
          return nextActiveWindowsByEdge;
        });
      }
    },
    [activeWindowsByEdge],
  );

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
    (id: string): DockedWindow | undefined => {
      const result = state.dockedWindows.get(id);
      if (result) {
        console.log("🟣 DockingContext.getDockedWindow - FOUND:", { id, result });
      }
      return result;
    },
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

  const setActiveWindowOnEdge = useCallback((edge: DockEdge, id: string): void => {
    setActiveWindowsByEdge((prevActiveWindowsByEdge) => {
      if (prevActiveWindowsByEdge.get(edge) === id) {
        return prevActiveWindowsByEdge;
      }
      const nextActiveWindowsByEdge = new Map(prevActiveWindowsByEdge);
      nextActiveWindowsByEdge.set(edge, id);
      return nextActiveWindowsByEdge;
    });
  }, []);

  const getActiveWindowOnEdge = useCallback(
    (edge: DockEdge): string | null => {
      return activeWindowsByEdge.get(edge) ?? null;
    },
    [activeWindowsByEdge],
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

  const contextValue: DockingContextType = {
    state,
    dock,
    undock,
    toggleCollapse,
    setActiveWindowOnEdge,
    getActiveWindowOnEdge,
    setPanelContentHost,
    getPanelContentHost,
    getDockedWindow,
    getWindowsOnEdge,
    isEdgeCollapsed,
    toggleEdgeCollapse,
  };

  return <DockingContext.Provider value={contextValue}>{children}</DockingContext.Provider>;
};
