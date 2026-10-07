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
  checkPosition,
  chkPosition,
  classNames,
  useContextWindowDrag,
  useDocking,
} from "../functions";
import styles from "./ContextWindow.module.css";
import { ContextWindowTitleBar } from "./ContextWindowTitleBar";
import type { DockEdge } from "./interface";

const dockedEdgeClassNames: Record<DockEdge, string> = {
  top: styles.dockedTop,
  bottom: styles.dockedBottom,
  left: styles.dockedLeft,
  right: styles.dockedRight,
};

export interface ContextWindowProps extends React.HTMLAttributes<HTMLDivElement> {
  allowUndock?: boolean;
  children: React.ReactNode;
  /** Edge used by the dock button while the window is floating (defaults to right) */
  defaultDockEdge?: DockEdge;
  /** When false, a docked window stays docked: no undock button, drag-undock or `undock()` */
  dockable?: boolean;
  id: string;
  /** Dock into this edge's DockPanel whenever the window opens (requires `dockable`) */
  initialDockEdge?: DockEdge;
  onClose?: () => void;
  onOpen?: () => void;
  style?: React.CSSProperties;
  title: string;
  titleElement?: ReactNode;
  visible: boolean;
}

export interface ContextWindowHandle {
  pushToTop: () => void;
  dock: (edge: DockEdge) => void;
  undock: () => void;
}

export const ContextWindow = forwardRef<ContextWindowHandle, ContextWindowProps>(
  (
    {
      allowUndock = true,
      children,
      defaultDockEdge = "right",
      dockable = true,
      id,
      initialDockEdge,
      onClose,
      onOpen,
      title,
      titleElement,
      visible,
      ...rest
    },
    ref,
  ): React.ReactElement => {
    const divRef = useRef<HTMLDivElement | null>(null);
    const windowRef = useRef<HTMLDivElement | null>(null);

    // Docking state
    const docking = useDocking();
    const windowConfig = docking.getWindowConfig(id);
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
    // Register this ID so the provider includes it in the shared order after mount.
    useEffect(() => {
      dispatch({ type: "registerWindow", id });
      return () => {
        dispatch({ type: "unregisterWindow", id });
      };
    }, [dispatch, id]);

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

    const setWindowVisible = useCallback(
      (nextValue: boolean) => registerWindowConfig(id, { windowVisible: nextValue }),
      [id, registerWindowConfig],
    );
    const setMoving = useCallback(
      (nextValue: boolean) => registerWindowConfig(id, { moving: nextValue }),
      [id, registerWindowConfig],
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

        const restoreState = dockingRef.current?.getPreDockRect(id);
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
      [allowUndock, dispatch, id, isDocked],
    );
    useEffect(() => {
      docking.registerWindowActions(id, {
        onClose,
        onUndock: () => handleUndock(),
      });
      return () => docking.unregisterWindowActions(id);
    }, [docking, handleUndock, id, onClose]);

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

    // Undocking re-portals the node, so correct it in a layout effect after restored styles apply
    // and before paint instead of checking inside handleUndock, when the floating node may not exist.
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
        checkPosition(windowRef, move);
      }
    });

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
        defaultDockEdge,
        initialDockEdge,
        allowUndock,
        onMouseDown: onTitleMouseDown,
        canClose: onClose !== undefined,
        canDock: dockable && !isDocked,
        canUndock: dockable && isDocked && allowUndock,
        onDock: () => {
          if (!dockable || isDockedRef.current) {
            return;
          }
          handleDock(defaultDockEdge);
        },
        onUndock: () => {
          if (!dockable || !allowUndock || !isDockedRef.current) {
            return;
          }
          handleUndock();
        },
      });
    }, [
      registerWindowConfig,
      id,
      visible,
      title,
      titleElement,
      dockable,
      defaultDockEdge,
      initialDockEdge,
      allowUndock,
      isDocked,
      onClose,
      onTitleMouseDown,
      handleDock,
      handleUndock,
    ]);

    // A closed window must be positioned again before it is shown on the next open
    useEffect(() => {
      if (!visible && windowVisible) {
        setWindowVisible(false);
      }
    }, [visible, windowVisible, setWindowVisible]);

    // Save the floating position as the node leaves the DOM (close, or re-portal into a
    // DockPanel). Ref cleanup runs while the node is still attached, so the measured rect is
    // accurate and includes any drag translate.
    const setWindowNode = useCallback(
      (node: HTMLDivElement | null) => {
        windowRef.current = node;
        /* istanbul ignore next: React 19 uses this ref's returned cleanup on detach. */
        if (!node) {
          return;
        }
        return () => {
          windowRef.current = null;
          if (isDockedRef.current) {
            return;
          }
          const rect = node.getBoundingClientRect();
          // Nothing laid out (e.g. never shown) - keep any previously saved position
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

    useLayoutEffect(() => {
      if (visible && !windowVisible && divRef.current && windowRef.current) {
        // Position the window (a window opened straight into a DockPanel is laid out by the panel)
        if (!isDockedRef.current) {
          const savedRect = docking.getPreDockRect(id);
          let left: number;
          let top: number;
          const width = savedRect?.width ?? windowRef.current.offsetWidth ?? 300;
          const height = savedRect?.height ?? windowRef.current.offsetHeight ?? 200;

          if (savedRect) {
            // Restore previously saved floating position
            left = savedRect.x;
            top = savedRect.y;
          } else {
            // Center on screen when no saved position
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
          // Seed the opening transform directly; checkPosition is reserved for completed transitions.
          const checkedPosition = chkPosition(windowRef);
          windowRef.current.style.transform = `translate(${checkedPosition.translateX}px, ${checkedPosition.translateY}px)`;
          windowPos.current = {
            x: checkedPosition.translateX,
            y: checkedPosition.translateY,
          };
        }

        // Bring to front and make visible
        onOpen?.();
        dispatch({ type: "raiseWindow", id });
        setWindowVisible(true);
      }
    }, [docking, dispatch, id, onOpen, setWindowVisible, visible, windowVisible]);

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
        {visible &&
          createPortal(
            <div
              {...rest}
              ref={setWindowNode}
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
                if (e.currentTarget.contains(e.target as Node)) {
                  if (isDocked && dockedWindow && activeDockedWindowId !== id) {
                    dispatch({ type: "setActiveWindowOnEdge", edge: dockedWindow.edge, id });
                  }
                  dispatch({ type: "raiseWindow", id });
                }
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
