import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import type {
  DockEdge,
  DockedWindow,
  DockingWindowController,
  WindowConfig,
} from "../components/interface";
import { checkPosition } from "./checkPosition";
import { chkPosition } from "./chkPosition";
import { useContextWindowDrag } from "./useContextWindowDrag";
import { useDocking } from "./useDocking";

interface PendingFloatingStyle {
  left: number;
  top: number;
  width?: number;
  height?: number;
  anchorToPointer?: boolean;
  centerInViewport?: boolean;
}

export interface ContextWindowController {
  dock: (edge: DockEdge) => void;
  dockedWindow: DockedWindow | undefined;
  divRef: React.RefObject<HTMLDivElement | null>;
  handleWindowClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  isActiveDockedWindow: boolean;
  isDocked: boolean;
  moving: boolean;
  onTitleMouseDown: (event: React.MouseEvent<HTMLElement>) => void;
  portalTarget: Element | DocumentFragment;
  pushToTop: () => void;
  registerWindowConfig: (id: string, config: Partial<WindowConfig>) => void;
  onDock: (edge: DockEdge) => void;
  onUndock: () => void;
  setWindowNode: (node: HTMLDivElement | null) => void;
  undock: () => void;
  windowVisible: boolean;
  windowRef: React.RefObject<HTMLDivElement | null>;
  zIndex: number;
}

interface UseContextWindowOptions {
  onClose?: () => void;
  onOpen?: () => void;
}

/** Owns the docking and positioning behavior for the window identified by `id`. */
export const useContextWindow = (
  id: string,
  { onClose, onOpen }: UseContextWindowOptions = {},
): ContextWindowController => {
  const docking = useDocking();
  const windowConfig = docking.getWindowConfig(id);
  const allowUndock = windowConfig.allowUndock ?? true;
  const dockable = windowConfig.dockable ?? true;
  const initialDockEdge = windowConfig.initialDockEdge;
  const visible = windowConfig.visible ?? false;
  const windowVisible = windowConfig.windowVisible ?? false;
  const moving = windowConfig.moving ?? false;
  const dockedWindow = docking.getDockedWindow(id);
  const isDocked = !!dockedWindow;
  const activeDockedWindowId =
    isDocked && dockedWindow ? (docking.getActiveWindowOnEdge(dockedWindow.edge) ?? null) : null;
  const isActiveDockedWindow =
    !isDocked || !dockedWindow || !activeDockedWindowId || activeDockedWindowId === id;
  const dockPanelContentHost =
    isDocked && dockedWindow ? (docking.getPanelContentHost(dockedWindow.edge) ?? null) : null;
  const portalTarget = dockPanelContentHost ?? document.body;
  const zIndex = docking.getWindowZIndex(id);
  const dispatch = docking.dispatch;
  const registerWindowConfig = docking.registerWindowConfig;
  const registerWindowController = docking.registerWindowController;
  const unregisterWindowController = docking.unregisterWindowController;

  const divRef = useRef<HTMLDivElement | null>(null);
  const windowRef = useRef<HTMLDivElement | null>(null);
  const positionedWindowRef = useRef<HTMLDivElement | null>(null);
  const windowPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDockedRef = useRef<boolean>(isDocked);
  const dockingRef = useRef(docking);
  const undockViaActionRef = useRef<boolean>(false);
  const pendingFloatingStyleRef = useRef<PendingFloatingStyle | null>(null);

  // Keep the window in the provider's global z-order for its mounted lifetime.
  useEffect(() => {
    dispatch({ type: "registerWindow", id });
    return () => dispatch({ type: "unregisterWindow", id });
  }, [dispatch, id]);

  // Make the current docked state available to document-level drag handlers immediately.
  useLayoutEffect(() => {
    isDockedRef.current = isDocked;
  }, [isDocked]);

  // Keep unmount cleanup pointed at the latest provider instance.
  useLayoutEffect(() => {
    dockingRef.current = docking;
  }, [docking]);

  // Release this window's dock slot if it unmounts while docked.
  useEffect(
    () => () => {
      if (isDockedRef.current) {
        dockingRef.current.dispatch({ type: "undock", id });
      }
    },
    [id],
  );

  // Apply pointer deltas directly to the floating element without a React render.
  const move = useCallback((x: number, y: number) => {
    if (windowRef.current && !isDockedRef.current) {
      windowPos.current.x += x;
      windowPos.current.y += y;
      windowRef.current.style.transform = `translate(${windowPos.current.x}px, ${windowPos.current.y}px)`;
    }
  }, []);

  // Persist visibility changes in the provider's window config.
  const setWindowVisible = useCallback(
    (nextValue: boolean) => registerWindowConfig(id, { windowVisible: nextValue }),
    [id, registerWindowConfig],
  );
  // Persist movement state so the title bar and window style stay in sync.
  const setMoving = useCallback(
    (nextValue: boolean) => registerWindowConfig(id, { moving: nextValue }),
    [id, registerWindowConfig],
  );

  // Preserve the floating rect before docking so the window can be restored later.
  const handleDock = useCallback(
    (edge: DockEdge) => {
      if (!windowRef.current) {
        dispatch({ type: "dock", id, edge });
        return;
      }

      const rect = isDocked ? null : windowRef.current.getBoundingClientRect();
      dispatch({
        type: "dock",
        id,
        edge,
        preDockRect: rect && {
          x: rect.left + window.scrollX,
          y: rect.top + window.scrollY,
          width: rect.width,
          height: rect.height,
        },
      });
    },
    [dispatch, id, isDocked],
  );

  // Capture the pending floating placement before removing the window from its panel.
  const handleUndock = useCallback(
    (pointer?: { x: number; y: number }) => {
      if (!isDocked || !allowUndock) {
        return;
      }

      const restoreState = dockingRef.current.getPreDockRect(id);
      if (pointer) {
        pendingFloatingStyleRef.current = {
          left: pointer.x,
          top: pointer.y,
          width: restoreState?.width,
          height: restoreState?.height,
          anchorToPointer: true,
        };
      } else if (restoreState) {
        pendingFloatingStyleRef.current = {
          left: restoreState.x,
          top: restoreState.y,
          width: restoreState.width,
          height: restoreState.height,
        };
      } else {
        pendingFloatingStyleRef.current = {
          left: 0,
          top: 0,
          centerInViewport: true,
        };
      }

      undockViaActionRef.current = !pointer;
      dispatch({ type: "undock", id, viaDrag: !!pointer });
    },
    [allowUndock, dispatch, id, isDocked],
  );

  // Guard controller docking actions against stale controls and non-dockable windows.
  const onDock = useCallback(
    (edge: DockEdge) => {
      if (dockable && !isDockedRef.current) {
        handleDock(edge);
      }
    },
    [dockable, handleDock],
  );
  // Guard controller undocking actions against stale controls and locked windows.
  const onUndock = useCallback(() => {
    if (dockable && allowUndock && isDockedRef.current) {
      handleUndock();
    }
  }, [allowUndock, dockable, handleUndock]);

  const { onTitleMouseDown, armInteractionEnd, lastMousePosRef } = useContextWindowDrag({
    id,
    dockable,
    allowUndock,
    isDocked,
    dockedEdge: dockedWindow?.edge,
    windowVisible,
    moving,
    windowRef,
    windowPosRef: windowPos,
    isDockedRef,
    dispatch,
    move,
    setMoving,
    setWindowVisible,
    handleDock,
    handleUndock,
  });

  // A docked window that becomes hidden must release its panel slot.
  useEffect(() => {
    if (!visible && isDocked) {
      dispatch({ type: "undock", id });
    }
  }, [dispatch, id, isDocked, visible]);

  // Apply initial docking before paint so the window never flashes as floating.
  const initialDockAppliedRef = useRef<boolean>(false);
  useLayoutEffect(() => {
    if (!visible) {
      initialDockAppliedRef.current = false;
      return;
    }
    if (initialDockEdge && !initialDockAppliedRef.current) {
      initialDockAppliedRef.current = true;
      if (!isDockedRef.current) {
        dispatch({ type: "dock", id, edge: initialDockEdge });
      }
    }
  }, [dispatch, id, initialDockEdge, visible]);

  // Clear provider visibility when the public visible prop closes the window.
  useEffect(() => {
    if (!visible && windowVisible) {
      setWindowVisible(false);
    }
  }, [visible, windowVisible, setWindowVisible]);

  // Save the final floating rect while the detached node is still measurable.
  const setWindowNode = useCallback(
    (node: HTMLDivElement | null) => {
      windowRef.current = node;
      if (!node) {
        return;
      }
      return () => {
        windowRef.current = null;
        if (isDockedRef.current || positionedWindowRef.current !== node) {
          return;
        }
        positionedWindowRef.current = null;
        const rect = node.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) {
          return;
        }
        dispatch({
          type: "saveWindowPosition",
          id,
          rect: {
            x: rect.left + window.scrollX,
            y: rect.top + window.scrollY,
            width: rect.width,
            height: rect.height,
          },
        });
      };
    },
    [dispatch, id],
  );

  // Place and reveal the window when it opens, before the browser paints.
  useLayoutEffect(() => {
    if (visible && !windowVisible && windowRef.current) {
      if (!isDockedRef.current) {
        const savedRect = dockingRef.current.getPreDockRect(id);
        let left: number;
        let top: number;
        const width = savedRect?.width ?? windowRef.current.offsetWidth ?? 300;
        const height = savedRect?.height ?? windowRef.current.offsetHeight ?? 200;

        if (savedRect) {
          left = savedRect.x;
          top = savedRect.y;
        } else {
          left = Math.max(16, (window.innerWidth - width) / 2) + window.scrollX;
          top = Math.max(16, (window.innerHeight - height) / 2) + window.scrollY;
        }

        windowRef.current.style.left = `${left}px`;
        windowRef.current.style.top = `${top}px`;
        if (savedRect?.width !== undefined) {
          windowRef.current.style.width = `${savedRect.width}px`;
        }
        if (savedRect?.height !== undefined) {
          windowRef.current.style.height = `${savedRect.height}px`;
        }
        windowRef.current.style.transform = "";
        const position = chkPosition(windowRef);
        windowRef.current.style.transform = `translate(${position.translateX}px, ${position.translateY}px)`;
        windowPos.current = { x: position.translateX, y: position.translateY };
        positionedWindowRef.current = windowRef.current;
      }

      onOpen?.();
      dispatch({ type: "raiseWindow", id });
      setWindowVisible(true);
    }
  }, [dispatch, id, onOpen, setWindowVisible, visible, windowVisible]);

  // Defer viewport correction until a CSS resize interaction is released.
  useEffect(() => {
    if (!windowVisible || !windowRef.current || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => armInteractionEnd());
    observer.observe(windowRef.current);
    return () => observer.disconnect();
  }, [armInteractionEnd, windowVisible]);

  // Remove floating-only styles once the panel takes over positioning.
  useEffect(() => {
    if (isDocked && windowRef.current) {
      windowRef.current.style.left = "";
      windowRef.current.style.top = "";
      windowRef.current.style.transform = "";
      windowPos.current = { x: 0, y: 0 };
    }
  }, [id, isDocked, moving]);

  // Apply restored styles after the undocked node has been re-portaled into the DOM.
  useLayoutEffect(() => {
    const pending = pendingFloatingStyleRef.current;
    if (isDocked || !pending || !windowRef.current) {
      return;
    }
    pendingFloatingStyleRef.current = null;
    const element = windowRef.current;
    let { left, top } = pending;
    if (pending.anchorToPointer) {
      const pointer = lastMousePosRef.current;
      const width = pending.width ?? 200;
      left = Math.max(0, pointer.x - width / 2) + window.scrollX;
      top = Math.max(0, pointer.y - 14) + window.scrollY;
    } else if (pending.centerInViewport) {
      left = Math.max(16, (window.innerWidth - element.offsetWidth) / 2) + window.scrollX;
      top = Math.max(16, (window.innerHeight - element.offsetHeight) / 2) + window.scrollY;
    } else {
      const padding = 16;
      const width = pending.width ?? element.offsetWidth;
      const height = pending.height ?? element.offsetHeight;
      const viewLeft = left - window.scrollX;
      const viewTop = top - window.scrollY;
      if (viewLeft + width > window.innerWidth) {
        left = Math.max(padding, window.innerWidth - width - padding) + window.scrollX;
      }
      if (viewTop + height > window.innerHeight) {
        top = Math.max(padding, window.innerHeight - height - padding) + window.scrollY;
      }
    }
    element.style.left = `${left}px`;
    element.style.top = `${top}px`;
    element.style.transform = "";
    if (pending.width !== undefined) element.style.width = `${pending.width}px`;
    if (pending.height !== undefined) element.style.height = `${pending.height}px`;
    windowPos.current = { x: 0, y: 0 };
    if (undockViaActionRef.current) {
      undockViaActionRef.current = false;
      checkPosition(windowRef, move);
    }
    positionedWindowRef.current = element;
  });

  // Raise the window when its surface is clicked and activate it within its dock edge.
  const handleWindowClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.currentTarget.contains(event.target as Node)) {
        if (isDocked && dockedWindow && activeDockedWindowId !== id) {
          dispatch({ type: "setActiveWindowOnEdge", edge: dockedWindow.edge, id });
        }
        dispatch({ type: "raiseWindow", id });
      }
    },
    [activeDockedWindowId, dispatch, dockedWindow, id, isDocked],
  );

  // Raise the window when invoked through its imperative handle.
  const pushToTop = useCallback(() => dispatch({ type: "raiseWindow", id }), [dispatch, id]);
  // Preserve the action-based undock behavior for the imperative handle.
  const undock = useCallback(() => handleUndock(), [handleUndock]);

  // Register the hook-owned ref and actions so provider controls and the title bar can address this window by ID.
  useLayoutEffect(() => {
    const controller: DockingWindowController = {
      windowRef,
      onClose,
      onOpen,
      onMouseDown: onTitleMouseDown,
      onDock,
      onUndock,
    };
    registerWindowController(id, controller);
    return () => unregisterWindowController(id);
  }, [
    id,
    onClose,
    onDock,
    onOpen,
    onTitleMouseDown,
    onUndock,
    registerWindowController,
    unregisterWindowController,
    windowRef,
  ]);

  return {
    dock: handleDock,
    dockedWindow,
    divRef,
    handleWindowClick,
    isActiveDockedWindow,
    isDocked,
    moving,
    onTitleMouseDown,
    portalTarget,
    pushToTop,
    registerWindowConfig,
    onDock,
    onUndock,
    setWindowNode,
    undock,
    windowVisible,
    windowRef,
    zIndex,
  };
};
