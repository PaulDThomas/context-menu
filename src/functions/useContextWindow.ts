import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import type {
  ContextWindowController,
  DockEdge,
  DockingWindowController,
  PendingFloatingStyle,
} from "../components/interface";
import { checkPosition } from "./checkPosition";
import { WINDOW_DATA_ATTRIBUTE } from "./contextWindowConstants";
import { positionFloatingWindow } from "./positionFloatingWindow";
import { restoreFloatingWindow } from "./restoreFloatingWindow";
import { useContextWindowDrag } from "./useContextWindowDrag";
import { useOptionalDocking } from "./useOptionalDocking";
import { useStandaloneContextWindowState } from "./useStandaloneContextWindowState";
import { useStandaloneWindowZIndex } from "./useStandaloneWindowZIndex";

interface UseContextWindowOptions {
  onClose?: () => void;
  onOpen?: () => void;
}

/** Owns the docking and positioning behavior for the window identified by `id`. */
export const useContextWindow = (
  id: string,
  { onClose, onOpen }: UseContextWindowOptions = {},
): ContextWindowController => {
  const divRef = useRef<HTMLDivElement | null>(null);
  const windowRef = useRef<HTMLDivElement | null>(null);
  const docking = useOptionalDocking();
  const hasDocking = !!docking;
  const standalone = useStandaloneContextWindowState(id);
  const stacking = useStandaloneWindowZIndex(!docking, windowRef);
  const windowConfig = docking?.getWindowConfig(id) ?? standalone.windowConfig;
  const allowUndock = windowConfig.allowUndock ?? true;
  const dockable = !!docking && (windowConfig.dockable ?? true);
  const initialDockEdge = docking ? windowConfig.initialDockEdge : undefined;
  const visible = windowConfig.visible ?? false;
  const windowVisible = windowConfig.windowVisible ?? false;
  const moving = windowConfig.moving ?? false;
  const dockedWindow = docking?.getDockedWindow(id);
  const isDocked = !!dockedWindow;
  const activeDockedWindowId =
    isDocked && dockedWindow ? (docking?.getActiveWindowOnEdge(dockedWindow.edge) ?? null) : null;
  const isActiveDockedWindow =
    !isDocked || !dockedWindow || !activeDockedWindowId || activeDockedWindowId === id;
  const dockPanelContentHost =
    isDocked && dockedWindow ? (docking?.getPanelContentHost(dockedWindow.edge) ?? null) : null;
  const portalTarget = dockPanelContentHost ?? document.body;
  const zIndex = docking?.getWindowZIndex(id) ?? stacking.zIndex;
  const dispatch = docking?.dispatch ?? standalone.dispatch;
  const registerWindowConfig = docking?.registerWindowConfig ?? standalone.registerWindowConfig;
  const registerWindowController = docking?.registerWindowController;
  const unregisterWindowController = docking?.unregisterWindowController;
  const getPreDockRect = docking?.getPreDockRect ?? standalone.getPreDockRect;
  const raiseStandalone = stacking.pushToTop;
  const pushToTop = useCallback(() => {
    if (docking) dispatch({ type: "raiseWindow", id });
    else raiseStandalone();
  }, [docking, dispatch, id, raiseStandalone]);

  const positionedWindowRef = useRef<HTMLDivElement | null>(null);
  const windowPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDockedRef = useRef<boolean>(isDocked);
  const dockingRef = useRef(docking);
  const undockViaActionRef = useRef<boolean>(false);
  const pendingFloatingStyleRef = useRef<PendingFloatingStyle | null>(null);

  // Keep the window in the provider's global z-order for its mounted lifetime.
  useEffect(() => {
    if (!hasDocking) return;
    dispatch({ type: "registerWindow", id });
    return () => dispatch({ type: "unregisterWindow", id });
  }, [dispatch, hasDocking, id]);

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
        dockingRef.current?.dispatch({ type: "undock", id });
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
      if (!hasDocking) return;
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
    [dispatch, hasDocking, id, isDocked],
  );

  // Capture the pending floating placement before removing the window from its panel.
  const handleUndock = useCallback(
    (pointer?: { x: number; y: number }) => {
      if (!isDocked || !allowUndock) {
        return;
      }

      const restoreState = getPreDockRect(id);
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
    [allowUndock, dispatch, getPreDockRect, id, isDocked],
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
    dockingEnabled: !!docking,
    pushToTop,
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
      if (!hasDocking) node.setAttribute(WINDOW_DATA_ATTRIBUTE, "true");
      else node.removeAttribute(WINDOW_DATA_ATTRIBUTE);
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
    [dispatch, hasDocking, id],
  );

  // Place and reveal the window when it opens, before the browser paints.
  useLayoutEffect(() => {
    if (visible && !windowVisible && windowRef.current) {
      if (!isDockedRef.current) {
        const savedRect = getPreDockRect(id);
        windowPos.current = positionFloatingWindow(windowRef.current, savedRect);
        positionedWindowRef.current = windowRef.current;
      }

      onOpen?.();
      pushToTop();
      setWindowVisible(true);
    }
  }, [getPreDockRect, id, onOpen, pushToTop, setWindowVisible, visible, windowVisible]);

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
    restoreFloatingWindow(element, pending, lastMousePosRef.current);
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
        pushToTop();
      }
    },
    [activeDockedWindowId, dispatch, dockedWindow, id, isDocked, pushToTop],
  );

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
    registerWindowController?.(id, controller);
    return () => unregisterWindowController?.(id);
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
    onClose,
    setWindowNode,
    undock,
    windowConfig,
    windowVisible,
    windowRef,
    zIndex,
  };
};
