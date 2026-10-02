import {
  forwardRef,
  ReactNode,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import {
  chkPosition,
  classNames,
  fitToViewport,
  useContextWindowDrag,
  useDocking,
} from "../functions";
import styles from "./ContextWindow.module.css";
import { ContextWindowTitleBar } from "./ContextWindowTitleBar";
import type { DockEdge, WindowConfig } from "./interface";

const dockedEdgeClassNames: Record<DockEdge, string> = {
  top: styles.dockedTop,
  bottom: styles.dockedBottom,
  left: styles.dockedLeft,
  right: styles.dockedRight,
};

export interface ContextWindowProps extends React.HTMLAttributes<HTMLDivElement> {
  id: string;
  visible: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  title: string;
  titleElement?: ReactNode;
  style?: React.CSSProperties;
  children: React.ReactNode;
  dockable?: boolean;
  /** Dock into this edge's DockPanel whenever the window opens (requires `dockable`) */
  initialDockEdge?: DockEdge;
  /** When false, a docked window stays docked: no undock button, drag-undock or `undock()` */
  allowUndock?: boolean;
}

export interface ContextWindowHandle {
  pushToTop: () => void;
  dock: (edge: DockEdge) => void;
  undock: () => void;
}

export const ContextWindow = forwardRef<ContextWindowHandle, ContextWindowProps>(
  (
    {
      id,
      visible,
      title,
      titleElement,
      children,
      onOpen,
      onClose,
      dockable = false,
      initialDockEdge,
      allowUndock = true,
      ...rest
    },
    ref,
  ): React.ReactElement => {
    const divRef = useRef<HTMLDivElement | null>(null);
    const windowRef = useRef<HTMLDivElement | null>(null);

    // Docking state
    const docking = useDocking();
    const windowConfig = docking.getWindowConfig(id);
    const windowInDOM = windowConfig.windowInDOM ?? visible;
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
    const minZIndex = docking.minZIndex;
    const maxZIndex = docking.maxZIndex;

    // Without a DockingProvider a window cannot stack, so it sits on its own floor
    const zIndex = docking.getWindowZIndex(id) ?? minZIndex;
    const dispatch = docking.dispatch;
    const registerWindowConfig = docking.registerWindowConfig;
    useEffect(() => {
      dispatch({ type: "registerWindow", id, zRange: { minZIndex, maxZIndex } });
      return () => {
        dispatch({ type: "unregisterWindow", id });
      };
    }, [dispatch, id, maxZIndex, minZIndex]);

    // Live docked state for document-level drag handlers; set eagerly on drag-undock so a
    // single drag can undock and then re-dock without releasing the mouse
    const isDockedRef = useRef<boolean>(isDocked);
    useLayoutEffect(() => {
      isDockedRef.current = isDocked;
    }, [isDocked]);
    // Unmounting a docked window must release its DockPanel slot (and the panel if it was the last)
    const dockingRef = useRef(docking);
    useLayoutEffect(() => {
      dockingRef.current = docking;
    }, [docking]);
    useEffect(() => {
      return () => {
        if (isDockedRef.current) {
          dockingRef.current?.dispatch({ type: "undock", id });
        }
      };
    }, [id]);

    // Position
    const windowPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const undockViaActionRef = useRef<boolean>(false);
    // Docking re-portals the window between document.body and the DockPanel, which remounts
    // the DOM node. Floating styles must be applied to the new node after it mounts.
    const pendingFloatingStyleRef = useRef<{
      left: number;
      top: number;
      width?: number;
      height?: number;
      anchorToPointer?: boolean;
    } | null>(null);

    const move = useCallback((x: number, y: number) => {
      // Read the live docked state: this runs from document listeners that may fire
      // before React has re-rendered after a drag-undock
      if (windowRef.current && !isDockedRef.current) {
        windowPos.current.x += x;
        windowPos.current.y += y;
        windowRef.current.style.transform = `translate(${windowPos.current.x}px, ${windowPos.current.y}px)`;
      }
    }, []);

    const updateWindowConfig = useCallback(
      (configUpdates: Partial<WindowConfig>) => {
        registerWindowConfig(id, { ...docking.getWindowConfig(id), ...configUpdates });
      },
      [docking, id, registerWindowConfig],
    );
    const setWindowInDOM = useCallback(
      (nextValue: boolean) => {
        if ((docking.getWindowConfig(id).windowInDOM ?? false) === nextValue) {
          return;
        }
        updateWindowConfig({ windowInDOM: nextValue });
      },
      [docking, id, updateWindowConfig],
    );
    const setWindowVisible = useCallback(
      (nextValue: boolean) => {
        if ((docking.getWindowConfig(id).windowVisible ?? false) === nextValue) {
          return;
        }
        updateWindowConfig({ windowVisible: nextValue });
      },
      [docking, id, updateWindowConfig],
    );
    const setMoving = useCallback(
      (nextValue: boolean) => {
        if ((docking.getWindowConfig(id).moving ?? false) === nextValue) {
          return;
        }
        updateWindowConfig({ moving: nextValue });
      },
      [docking, id, updateWindowConfig],
    );

    const handleDock = useCallback(
      (edge: DockEdge) => {
        if (!windowRef.current) {
          // Docking before the window node exists (e.g. from a mount effect): nothing to restore later
          dispatch({ type: "dock", id, edge });
          return;
        }

        // Preserve the original floating coordinates while side-switching a docked window.
        // If a window is already docked, left/top are panel-relative (often 0/empty),
        // so we only capture a new floating rect when docking from floating mode.
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

    const handleUndock = useCallback(
      (pointer?: { x: number; y: number }) => {
        if (!isDocked || !allowUndock) {
          return;
        }

        const restoreState = docking.getPreDockRect(id);
        if (pointer) {
          // Drag-undock: centre the header under the pointer (resolved from the latest pointer
          // position when applied) so the drag continues seamlessly
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
          // No saved floating position (e.g. opened docked) - open below the anchor like a
          // normal open; the on-screen clamp after remount keeps it visible
          const anchor = divRef.current?.getBoundingClientRect();
          pendingFloatingStyleRef.current = {
            left:
              (anchor?.left ??
                // istanbul ignore next
                16) + window.scrollX,
            top:
              (anchor?.bottom ??
                // istanbul ignore next
                16) + window.scrollY,
          };
        }

        // Any non-drag undock (header button, imperative ref.undock(), etc.) must land fully on-screen.
        // Drag-undocks are left alone so the window stays attached to the pointer.
        undockViaActionRef.current = !pointer;

        dispatch({ type: "undock", id, viaDrag: !!pointer });
      },
      [allowUndock, dispatch, docking, id, isDocked],
    );
    useEffect(() => {
      if (!docking) {
        return;
      }
      docking.registerWindowActions(id, {
        onClose,
        onUndock: () => handleUndock(),
      });
      return () => docking.unregisterWindowActions(id);
    }, [docking, handleUndock, id, onClose]);

    const handleDockRef = useRef(handleDock);
    useLayoutEffect(() => {
      handleDockRef.current = handleDock;
    }, [handleDock]);

    const handleUndockRef = useRef(handleUndock);
    useLayoutEffect(() => {
      handleUndockRef.current = handleUndock;
    }, [handleUndock]);

    const checkPosition = useCallback(() => {
      const chkPos = chkPosition(windowRef);
      move(chkPos.translateX, chkPos.translateY);
      fitToViewport(windowRef.current);
    }, [move]);

    const { onTitleMouseDown, armInteractionEnd, lastMousePosRef } = useContextWindowDrag({
      id,
      dockable,
      allowUndock,
      isDocked,
      dockedEdge: dockedWindow?.edge,
      windowVisible,
      windowRef,
      windowPosRef: windowPos,
      isDockedRef,
      dispatch,
      move,
      setMoving,
      setWindowVisible,
      checkPosition,
      handleDock,
      handleUndock,
    });

    // Expose imperative methods via ref
    useImperativeHandle(
      ref,
      () => ({
        pushToTop: () => dispatch({ type: "raiseWindow", id }),
        dock: (edge: DockEdge) => handleDock(edge),
        undock: () => handleUndock(),
      }),
      [dispatch, id, handleDock, handleUndock],
    );

    // Apply restored floating position to the newly mounted (re-portaled) window node after undock
    useLayoutEffect(() => {
      const pending = pendingFloatingStyleRef.current;
      if (isDocked || !pending || !windowRef.current) {
        return;
      }
      pendingFloatingStyleRef.current = null;
      const el = windowRef.current;
      let { left, top } = pending;
      /* istanbul ignore else */
      if (pending.anchorToPointer) {
        // Use the latest pointer position - moves may have arrived before this re-render
        const pointer = lastMousePosRef.current;
        const width = pending.width ?? 200;
        left = Math.max(0, pointer.x - width / 2) + window.scrollX;
        top = Math.max(0, pointer.y - 14) + window.scrollY;
      } else if (undockViaActionRef.current) {
        // Clamp before applying: even a transient off-screen position can add page scrollbars
        // that persist (e.g. with 100vw/100vh layouts) after checkPosition moves the window back
        const innerBounce = 16;
        const width = pending.width ?? el.offsetWidth;
        const height = pending.height ?? el.offsetHeight;
        const viewLeft = left - window.scrollX;
        const viewTop = top - window.scrollY;
        if (viewLeft + width > window.innerWidth) {
          left = Math.max(innerBounce, window.innerWidth - width - innerBounce) + window.scrollX;
        }
        if (viewTop + height > window.innerHeight) {
          top = Math.max(innerBounce, window.innerHeight - height - innerBounce) + window.scrollY;
        }
      }
      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
      el.style.transform = "";
      if (pending.width !== undefined) el.style.width = `${pending.width}px`;
      if (pending.height !== undefined) el.style.height = `${pending.height}px`;
      windowPos.current = { x: 0, y: 0 };
      if (undockViaActionRef.current) {
        undockViaActionRef.current = false;
        // Keep the window on-screen if the viewport changed while it was docked
        checkPosition();
      }
    });

    // Sync windowInDOM with visible prop using a layout effect to avoid ESLint warnings
    // This effect derives state from props, which is acceptable when there's no synchronous setState
    useEffect(() => {
      if (!visible && isDocked) {
        dispatch({ type: "undock", id });
      }
    }, [dispatch, id, isDocked, visible]);

    // Open straight into a DockPanel; a layout effect so it never paints as a floating window
    const initialDockAppliedRef = useRef<boolean>(false);
    useLayoutEffect(() => {
      if (!visible) {
        initialDockAppliedRef.current = false;
        return;
      }
      if (initialDockEdge && !initialDockAppliedRef.current) {
        initialDockAppliedRef.current = true;
        /* istanbul ignore else */
        if (!isDockedRef.current) {
          dispatch({ type: "dock", id, edge: initialDockEdge });
        }
      }
    }, [dispatch, id, initialDockEdge, visible]);

    useLayoutEffect(() => {
      registerWindowConfig(id, {
        id,
        visible,
        title,
        titleElement,
        dockable,
        initialDockEdge,
        allowUndock,
        onMouseDown: onTitleMouseDown,
        canDock: dockable && !isDocked,
        canUndock: dockable && isDocked && allowUndock,
        onDock: () => {
          if (!dockable || isDockedRef.current) {
            return;
          }
          handleDockRef.current("right");
        },
        onUndock: () => {
          if (!dockable || !allowUndock || !isDockedRef.current) {
            return;
          }
          handleUndockRef.current();
        },
      });
    }, [
      registerWindowConfig,
      id,
      visible,
      title,
      titleElement,
      dockable,
      initialDockEdge,
      allowUndock,
      isDocked,
      onTitleMouseDown,
    ]);

    useEffect(() => {
      if (visible && !windowInDOM) {
        // Window should be in DOM when visible becomes true
        setWindowInDOM(true);
      } else if (!visible && windowInDOM) {
        // Window should leave DOM when visible becomes false
        setWindowInDOM(false);
        setWindowVisible(false);
      }
    }, [visible, windowInDOM, setWindowInDOM, setWindowVisible]);

    useEffect(() => {
      if (windowInDOM && !windowVisible && visible && divRef.current && windowRef.current) {
        // Position the window (a window opened straight into a DockPanel is laid out by the panel)
        if (!isDockedRef.current) {
          const parentPos = divRef.current.getBoundingClientRect();
          const pos = windowRef.current.getBoundingClientRect();
          const windowHeight = pos.bottom - pos.top;
          windowRef.current.style.left = `${parentPos.left}px`;
          windowRef.current.style.top = `${
            parentPos.bottom + windowHeight < window.innerHeight
              ? parentPos.bottom
              : Math.max(0, parentPos.top - windowHeight)
          }px`;
          windowRef.current.style.transform = "";
          const checkedPosition = chkPosition(windowRef);
          windowRef.current.style.transform = `translate(${checkedPosition.translateX}px, ${checkedPosition.translateY}px)`;
          /* istanbul ignore else */
          if (windowPos && windowPos.current) {
            windowPos.current = {
              x: checkedPosition.translateX,
              y: checkedPosition.translateY,
            };
          }
        }

        // Bring to front and make visible - use startTransition
        onOpen?.();
        dispatch({ type: "raiseWindow", id });
        setWindowVisible(true);
      }
    }, [dispatch, id, onOpen, setWindowVisible, visible, windowInDOM, windowVisible]);

    // When CSS resize handle is used, defer checkPosition until resize interaction ends.
    useEffect(() => {
      if (!windowVisible || !windowRef.current || typeof ResizeObserver === "undefined") {
        return;
      }

      const observer = new ResizeObserver(() => {
        armInteractionEnd();
      });

      observer.observe(windowRef.current);

      return () => {
        observer.disconnect();
      };
    }, [armInteractionEnd, windowVisible]);

    // Clear floating position styles when window becomes docked
    useEffect(() => {
      if (isDocked && windowRef.current) {
        // Clear direct DOM style mutations that were set during floating state
        windowRef.current.style.left = "";
        windowRef.current.style.top = "";
        windowRef.current.style.transform = "";
        windowPos.current = { x: 0, y: 0 };
      }
    }, [id, isDocked, moving]);

    return (
      <div
        className={styles.contextWindowAnchor}
        ref={divRef}
      >
        {windowInDOM &&
          createPortal(
            <div
              {...rest}
              ref={windowRef}
              id={id}
              className={classNames(
                styles.contextWindow,
                isDocked && styles.docked,
                isDocked && dockedWindow && dockedEdgeClassNames[dockedWindow.edge],
                rest.className,
              )}
              style={{
                ...(isDocked ? {} : rest.style),
                opacity: moving ? 0.8 : windowVisible ? 1 : 0,
                visibility: windowVisible ? "visible" : "hidden",
                display: isDocked ? (isActiveDockedWindow ? "flex" : "none") : rest.style?.display,
                zIndex: zIndex,
                minHeight: isDocked ? "auto" : (rest.style?.minHeight ?? "150px"),
                minWidth: isDocked ? "auto" : (rest.style?.minWidth ?? "200px"),
                maxHeight: isDocked ? "100%" : (rest.style?.maxHeight ?? "1000px"),
                maxWidth: isDocked ? "100%" : (rest.style?.maxWidth ?? "1000px"),
                width: isDocked ? "100%" : rest.style?.width,
                height: isDocked ? "100%" : rest.style?.height,
              }}
              onClickCapture={(e) => {
                if (isDocked && dockedWindow && activeDockedWindowId !== id) {
                  dispatch({ type: "setActiveWindowOnEdge", edge: dockedWindow.edge, id });
                }
                dispatch({ type: "raiseWindow", id });
                rest.onClickCapture?.(e);
              }}
            >
              <ContextWindowTitleBar id={id} />
              <div className={styles.contextWindowBody}>
                <div>{children}</div>
              </div>
            </div>,
            portalTarget,
          )}
      </div>
    );
  },
);

ContextWindow.displayName = "ContextWindow";
