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
  }, []);

  const undock = useCallback((id: string): void => {
    console.log("🟠 DockingContext.undock called:", { id });
    setState((prevState) => {
      const newState = {
        ...prevState,
        dockedWindows: new Map(prevState.dockedWindows),
      };
      newState.dockedWindows.delete(id);
      console.log("🟠 DockingContext.undock - state updated:", {
        id,
        allDockedWindows: Array.from(newState.dockedWindows.keys()),
      });
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

  const contextValue: DockingContextType = {
    state,
    dock,
    undock,
    toggleCollapse,
    getDockedWindow,
    getWindowsOnEdge,
    isEdgeCollapsed,
    toggleEdgeCollapse,
  };

  return <DockingContext.Provider value={contextValue}>{children}</DockingContext.Provider>;
};
