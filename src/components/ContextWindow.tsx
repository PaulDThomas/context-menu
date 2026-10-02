import { useDocking } from "components";
import {
  forwardRef,
  ReactNode,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { chkPosition } from "../functions/chkPosition";
import { classNames } from "../functions/classNames";
import { MAX_Z_INDEX, MIN_Z_INDEX } from "../functions/contextWindowConstants";
import { useMouseMove } from "../functions/useMouseMove";
import styles from "./ContextWindow.module.css";
import { ContextWindowTitleBar } from "./ContextWindowTitleBar";
import type { DockEdge } from "./interface";

const SNAP_THRESHOLD = 24;
const UNDOCK_THRESHOLD = 20;
const SNAP_HYSTERESIS = 40; // px threshold to UN-snap once snapped (larger than SNAP_THRESHOLD)

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
  minZIndex?: number;
  maxZIndex?: number;
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
      minZIndex = MIN_Z_INDEX,
      maxZIndex = MAX_Z_INDEX,
      dockable = false,
      initialDockEdge,
      allowUndock = true,
      ...rest
    },
    ref,
  ): React.ReactElement => {
    const divRef = useRef<HTMLDivElement | null>(null);
    const windowRef = useRef<HTMLDivElement | null>(null);
    const [windowInDOM, setWindowInDOM] = useState<boolean>(false);
    const [windowVisible, setWindowVisible] = useState<boolean>(false);

    // Docking state
    const docking = useDocking();
    const dockedWindow = docking.getDockedWindow(id);
    const isDocked = !!dockedWindow;
    const activeDockedWindowId =
      isDocked && dockedWindow ? (docking.getActiveWindowOnEdge(dockedWindow.edge) ?? null) : null;
    const isActiveDockedWindow =
      !isDocked || !dockedWindow || !activeDockedWindowId || activeDockedWindowId === id;
    const dockPanelContentHost =
      isDocked && dockedWindow ? (docking.getPanelContentHost(dockedWindow.edge) ?? null) : null;
    const portalTarget = dockPanelContentHost ?? document.body;
    const targetSnapEdgeRef = useRef<DockEdge | null>(null);
    const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

    // Without a DockingProvider a window cannot stack, so it sits on its own floor
    const zIndex = docking.getWindowZIndex(id) ?? minZIndex;
    const registerWindow = docking.registerWindow;
    const registerWindowConfig = docking.registerWindowConfig;
    const unregisterWindow = docking.unregisterWindow;
    const raiseWindow = docking.raiseWindow;
    useEffect(() => {
      if (!registerWindow || !unregisterWindow) {
        return;
      }
      registerWindow(id, { minZIndex, maxZIndex });
      return () => {
        unregisterWindow(id);
      };
    }, [id, maxZIndex, minZIndex, registerWindow, unregisterWindow]);
    // Capture isDocked state at interaction start to prevent stale closures during re-renders
    const isDockedAtStartRef = useRef<boolean>(false);
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
          dockingRef.current?.undock(id);
        }
      };
    }, [id]);
    // Track if this interaction cycle has already been processed to prevent duplicate onInteractionEnd fires
    const interactionProcessedRef = useRef<boolean>(false);
    // Track if this window is currently in an active interaction (needed because useMouseMove fires globally)
    const isInInteractionRef = useRef<boolean>(false);

    // Position
    const windowPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const [moving, setMoving] = useState<boolean>(false);
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

    // Snap-to-dock detection
    const detectSnapEdge = useCallback(
      (mouseX: number, mouseY: number, currentSnap: DockEdge | null): DockEdge | null => {
        /* istanbul ignore next */
        if (!dockable || !docking || isDockedRef.current) {
          return null;
        }

        // Use hysteresis: if already snapped to an edge, use larger threshold to un-snap
        // This prevents snap from flickering as mouse jitters slightly
        const detectionThreshold = currentSnap ? SNAP_HYSTERESIS : SNAP_THRESHOLD;

        if (currentSnap === "left" && mouseX < detectionThreshold) {
          return "left";
        }
        if (currentSnap === "right" && mouseX > window.innerWidth - detectionThreshold) {
          return "right";
        }
        if (currentSnap === "top" && mouseY < detectionThreshold) {
          return "top";
        }
        if (currentSnap === "bottom" && mouseY > window.innerHeight - detectionThreshold) {
          return "bottom";
        }

        // If currently snapped but moved outside hysteresis threshold, clear snap
        /* istanbul ignore next */
        if (currentSnap) {
          return null;
        }

        // Not currently snapped, check with standard threshold
        const threshold = SNAP_THRESHOLD;

        if (mouseX < threshold) {
          return "left";
        }
        if (mouseX > window.innerWidth - threshold) {
          return "right";
        }
        if (mouseY < threshold) {
          return "top";
        }
        if (mouseY > window.innerHeight - threshold) {
          return "bottom";
        }

        return null;
      },
      [dockable, docking],
    );

    // Define fitToViewport before handleDock and handleUndock so they can use it
    const fitToViewport = useCallback(() => {
      /* istanbul ignore next */
      if (!windowRef.current) {
        return;
      }

      const viewportPadding = 32;
      const availableWidth = Math.max(0, window.innerWidth - viewportPadding);
      const availableHeight = Math.max(0, window.innerHeight - viewportPadding);
      const rect = windowRef.current.getBoundingClientRect();
      const horizontalChrome = rect.width - windowRef.current.clientWidth;
      const verticalChrome = rect.height - windowRef.current.clientHeight;

      if (rect.width > availableWidth) {
        windowRef.current.style.width = `${Math.max(0, availableWidth - horizontalChrome)}px`;
      }

      if (rect.height > availableHeight) {
        windowRef.current.style.height = `${Math.max(0, availableHeight - verticalChrome)}px`;
      }
    }, []);

    const handleDock = useCallback(
      (edge: DockEdge) => {
        /* istanbul ignore next */
        if (!docking) return;
        if (!windowRef.current) {
          // Docking before the window node exists (e.g. from a mount effect): nothing to restore later
          docking.dock(id, edge);
          return;
        }

        // Preserve the original floating coordinates while side-switching a docked window.
        // If a window is already docked, left/top are panel-relative (often 0/empty),
        // so we only capture a new floating rect when docking from floating mode.
        const rect = isDocked ? null : windowRef.current.getBoundingClientRect();
        docking.dock(
          id,
          edge,
          // Floating windows are absolutely positioned within document.body, so store document coordinates
          rect && {
            x: rect.left + window.scrollX,
            y: rect.top + window.scrollY,
            width: rect.width,
            height: rect.height,
          },
        );
      },
      [docking, id, isDocked],
    );

    const handleUndock = useCallback(
      (pointer?: { x: number; y: number }) => {
        /* istanbul ignore next */
        if (!docking || !isDocked) {
          return;
        }
        if (!allowUndock) {
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

        docking.undock(id, { viaDrag: !!pointer });
      },
      [id, docking, isDocked, allowUndock],
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

    const dockToRight = useCallback(() => {
      handleDock("right");
    }, [handleDock]);

    const undockFromTitleBar = useCallback(() => {
      handleUndock();
    }, [handleUndock]);

    const checkPosition = useCallback(() => {
      const chkPos = chkPosition(windowRef);
      move(chkPos.translateX, chkPos.translateY);
      fitToViewport();
    }, [fitToViewport, move]);

    // Helper function to push this window to the top
    const pushToTop = useCallback(() => {
      raiseWindow?.(id);
    }, [id, raiseWindow]);

    const parseTranslate = (transform?: string): { x: number; y: number } => {
      const match = transform?.match(/translate\((-?\d+(?:\.\d+)?)px,\s*(-?\d+(?:\.\d+)?)px\)/);
      if (match) {
        return {
          x: Number.parseFloat(match[1]),
          y: Number.parseFloat(match[2]),
        };
      }
      return { x: 0, y: 0 };
    };

    const { onMouseDown, armInteractionEnd } = useMouseMove({
      onMouseDown: () => {
        // Capture isDocked state at interaction start for use in onInteractionEnd
        // This prevents stale closures when the component re-renders during the same drag
        isDockedAtStartRef.current = isDocked;
        // Reset flags to allow this interaction to be processed
        interactionProcessedRef.current = false;
        isInInteractionRef.current = true; // Mark that this window is now in an active interaction
        windowPos.current = parseTranslate(windowRef.current?.style.transform);
        setMoving(true);
        docking.startDockDrag(id);
        // If we're starting a drag, the window must be visible enough to interact with
        // Force windowVisible to true to enable onInteractionEnd firing
        /* istanbul ignore next */
        if (!windowVisible) {
          setWindowVisible(true);
        }
        // CRITICAL: Arm the global interaction end listener so onInteractionEnd fires for this window
        armInteractionEnd();
        // Prevent scrollbars from appearing when window is dragged outside viewport
        document.body.style.overflow = "hidden";
        pushToTop();
      },
      onMouseMove: (e: MouseEvent) => {
        lastMousePosRef.current = { x: e.clientX, y: e.clientY };

        // Track if window became visible during drag (safety check)
        /* istanbul ignore next */
        if (!windowVisible && windowRef.current) {
          const rect = windowRef.current.getBoundingClientRect();
          const isInViewport =
            rect.bottom > 0 &&
            rect.right > 0 &&
            rect.top < window.innerHeight &&
            rect.left < window.innerWidth;
          if (isInViewport) {
            setWindowVisible(true);
          }
        }

        // Detect snap-to-dock (also after undocking earlier in this same drag)
        if (!isDockedRef.current && dockable) {
          const snapEdge = detectSnapEdge(e.clientX, e.clientY, targetSnapEdgeRef.current);
          targetSnapEdgeRef.current = snapEdge;
          docking.setDockDragEdge(snapEdge);
        }

        // Check for undock (if docked and dragged far from edge)
        if (isDockedRef.current && dockable && docking && allowUndock) {
          const edge = dockedWindow?.edge;
          let shouldUndock = false;

          if (edge === "top" && e.clientY > UNDOCK_THRESHOLD) shouldUndock = true;
          if (edge === "bottom" && e.clientY < window.innerHeight - UNDOCK_THRESHOLD)
            shouldUndock = true;
          if (edge === "left" && e.clientX > UNDOCK_THRESHOLD) shouldUndock = true;
          if (edge === "right" && e.clientX < window.innerWidth - UNDOCK_THRESHOLD)
            shouldUndock = true;

          if (shouldUndock) {
            // Positioning is applied after the floating node remounts (see useLayoutEffect)
            handleUndock({ x: e.clientX, y: e.clientY });
            isDockedRef.current = false;
            return;
          }
        }

        move(e.movementX, e.movementY);
      },
      onMouseUp: () => {
        setMoving(false);
        // Mark that this interaction is complete (safety cleanup)
        isInInteractionRef.current = false;
        // Safety cleanup - ensure snap indicator clears even if onInteractionEnd doesn't fire
        docking.setDockDragEdge(null);
        // Restore normal scrollbar behavior after drag ends
        document.body.style.overflow = "";
      },
      onInteractionEnd: () => {
        // Guard: only process if this window is actually in an interaction
        // useMouseMove fires onInteractionEnd for ALL mounted components globally when mouseup fires
        // We should only process for components that are actually in an active interaction
        if (!isInInteractionRef.current) {
          return;
        }

        // Check if this interaction has already been processed to prevent duplicate fires
        /* istanbul ignore next */
        if (interactionProcessedRef.current) {
          return;
        }
        interactionProcessedRef.current = true;

        // Snap to dock on interaction end if we're near an edge
        // Use isDockedAtStartRef to avoid stale closures from re-renders during the same interaction

        // Dock if the window is floating at release (including a window that was undocked
        // earlier in this same drag) and the pointer is over a snap zone
        const isDockedNow = isDockedRef.current;
        let isDocking = false;
        if (!isDockedNow && dockable && docking && targetSnapEdgeRef.current) {
          handleDock(targetSnapEdgeRef.current);
          isDocking = true;
        }

        docking.endDockDrag(id);
        targetSnapEdgeRef.current = null;
        // Mark that this interaction is complete
        isInInteractionRef.current = false;
        // Don't check position if docked, as the DockPanel handles layout
        if (!isDocking && !isDockedNow) {
          checkPosition();
        }
      },
      interactionEndEnabled: windowVisible,
      onViewportResize: () => {
        checkPosition();
      },
      viewportResizeEnabled: windowVisible,
    });

    // Expose pushToTop method via ref
    useImperativeHandle(
      ref,
      () => ({
        pushToTop,
        dock: (edge: DockEdge) => {
          handleDock(edge);
        },
        undock: () => {
          handleUndock();
        },
      }),
      [pushToTop, handleDock, handleUndock],
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
      if (!visible && isDocked && docking) {
        docking.undock(id);
      }
    }, [visible, isDocked, docking, id]);

    // Open straight into a DockPanel; a layout effect so it never paints as a floating window
    const initialDockAppliedRef = useRef<boolean>(false);
    useLayoutEffect(() => {
      if (!visible) {
        initialDockAppliedRef.current = false;
        return;
      }
      if (initialDockEdge && docking && !initialDockAppliedRef.current) {
        initialDockAppliedRef.current = true;
        /* istanbul ignore else */
        if (!isDockedRef.current) {
          docking.dock(id, initialDockEdge);
        }
      }
    }, [visible, initialDockEdge, docking, id]);

    useLayoutEffect(() => {
      const onDock = dockable && !isDocked ? dockToRight : undefined;
      const onUndock = dockable && isDocked && allowUndock ? undockFromTitleBar : undefined;

      registerWindowConfig(id, {
        id,
        visible,
        title,
        titleElement,
        style: rest.style,
        className: rest.className,
        children,
        minZIndex,
        maxZIndex,
        dockable,
        initialDockEdge,
        allowUndock,
        onOpen,
        onClose,
        windowInDOM,
        windowVisible,
        moving,
        onMouseDown,
        onDock,
        onUndock,
      });
    }, [
      registerWindowConfig,
      id,
      visible,
      title,
      titleElement,
      rest.style,
      rest.className,
      children,
      minZIndex,
      maxZIndex,
      dockable,
      initialDockEdge,
      allowUndock,
      onOpen,
      onClose,
      windowInDOM,
      windowVisible,
      moving,
      onMouseDown,
      isDocked,
      dockToRight,
      undockFromTitleBar,
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
        pushToTop();
        setWindowVisible(true);
      }
    }, [onOpen, pushToTop, setWindowVisible, visible, windowInDOM, windowVisible]);

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
        // Also clear the snap edge ref since we've docked
        targetSnapEdgeRef.current = null;
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
                  docking.setActiveWindowOnEdge(dockedWindow.edge, id);
                }
                pushToTop();
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
