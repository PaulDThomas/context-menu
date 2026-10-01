import {
  forwardRef,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";
import { chkPosition } from "../functions/chkPosition";
import { classNames } from "../functions/classNames";
import {
  CONTEXT_WINDOW_DATA_ATTR,
  CONTEXT_WINDOW_MIN_Z_INDEX_DATA_ATTR,
  CONTEXT_WINDOW_RESET_EVENT,
  CONTEXT_WINDOW_RESET_SOURCE_DATA_ATTR,
  MAX_Z_INDEX,
  MIN_Z_INDEX,
} from "../functions/contextWindowConstants";
import { getMaxZIndex } from "../functions/getMaxZIndex";
import { resetAllWindowZIndexes } from "../functions/resetAllWindowZIndexes";
import { useMouseMove } from "../functions/useMouseMove";
import styles from "./ContextWindow.module.css";
import { ContextWindowTitleBar } from "./ContextWindowTitleBar";
import { DockZoneIndicator } from "./DockZoneIndicator";
import { DockingContext } from "./DockingContext";
import type { DockEdge, StackDirection } from "./interface";

export { MAX_Z_INDEX, MIN_Z_INDEX };

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
  defaultStackDirection?: StackDirection;
  /** Dock into this edge's DockPanel whenever the window opens (requires `dockable`) */
  initialDockEdge?: DockEdge;
  /** When false, a docked window stays docked: no undock button, drag-undock or `undock()` */
  allowUndock?: boolean;
}

export interface ContextWindowHandle {
  pushToTop: () => void;
  dock: (edge: DockEdge, stackDirection: StackDirection) => void;
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
      defaultStackDirection = "vertical",
      initialDockEdge,
      allowUndock = true,
      ...rest
    },
    ref,
  ): React.ReactElement => {
    const divRef = useRef<HTMLDivElement | null>(null);
    const windowRef = useRef<HTMLDivElement | null>(null);
    const [zIndex, setZIndex] = useState<number>(minZIndex);

    // Track internal state: whether window is in DOM and whether it's been positioned
    const [windowInDOM, setWindowInDOM] = useState<boolean>(false);
    const [windowVisible, setWindowVisible] = useState<boolean>(false);
    const [, startTransition] = useTransition();

    // Docking state
    const dockingContext = useContext(DockingContext);
    const docking = dockable && dockingContext ? dockingContext : null;
    const dockedWindow = docking?.getDockedWindow(id);
    const isDocked = !!dockedWindow;
    const activeDockedWindowId =
      isDocked && dockedWindow
        ? (docking?.getActiveWindowOnEdge?.(dockedWindow.edge) ?? null)
        : null;
    const isActiveDockedWindow =
      !isDocked || !dockedWindow || !activeDockedWindowId || activeDockedWindowId === id;
    const dockPanelContentHost =
      isDocked && dockedWindow ? (docking?.getPanelContentHost?.(dockedWindow.edge) ?? null) : null;
    const portalTarget = dockPanelContentHost ?? document.body;
    const [targetSnapEdge, setTargetSnapEdge] = useState<DockEdge | null>(null);
    const targetSnapEdgeRef = useRef<DockEdge | null>(null);
    const [isDraggingForDock, setIsDraggingForDock] = useState<boolean>(false);
    const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

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
    const [preDockState, setPreDockState] = useState<{
      x: number;
      y: number;
      width: number;
      height: number;
    } | null>(null);
    const preDockStateRef = useRef<{
      x: number;
      y: number;
      width: number;
      height: number;
    } | null>(null);
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
      (edge: DockEdge, stackDirection: StackDirection) => {
        /* istanbul ignore next */
        if (!docking) return;
        if (!windowRef.current) {
          // Docking before the window node exists (e.g. from a mount effect): nothing to restore later
          docking.dock(id, edge, stackDirection);
          return;
        }

        // Preserve the original floating coordinates while side-switching a docked window.
        // If a window is already docked, left/top are panel-relative (often 0/empty),
        // so we only capture a new preDockState when docking from floating mode.
        if (!isDocked) {
          const rect = windowRef.current.getBoundingClientRect();
          // Floating windows are absolutely positioned within document.body, so store document coordinates
          const nextPreDockState = {
            x: rect.left + window.scrollX,
            y: rect.top + window.scrollY,
            width: rect.width,
            height: rect.height,
          };
          preDockStateRef.current = nextPreDockState;
          setPreDockState(nextPreDockState);
        }

        docking.dock(id, edge, stackDirection);
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

        const restoreState = preDockStateRef.current ?? preDockState;
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
            left: (anchor?.left ?? 16) + window.scrollX,
            top: (anchor?.bottom ?? 16) + window.scrollY,
          };
        }

        // Any non-drag undock (header button, imperative ref.undock(), etc.) must land fully on-screen.
        // Drag-undocks are left alone so the window stays attached to the pointer.
        undockViaActionRef.current = !pointer;

        docking.undock(id);
      },
      [id, docking, isDocked, preDockState, allowUndock],
    );

    const checkPosition = useCallback(() => {
      const chkPos = chkPosition(windowRef);
      move(chkPos.translateX, chkPos.translateY);
      fitToViewport();
    }, [fitToViewport, move]);

    const getRecalculatedMaxZIndex = useCallback(() => {
      let maxZIndexInUse = getMaxZIndex(minZIndex, windowRef.current);
      let resetApplied = false;

      if (typeof maxZIndex === "number" && maxZIndexInUse >= maxZIndex) {
        resetAllWindowZIndexes(minZIndex, id);
        maxZIndexInUse = getMaxZIndex(minZIndex, windowRef.current);
        resetApplied = true;
      }

      return { maxZIndexInUse, resetApplied };
    }, [id, maxZIndex, minZIndex]);

    // Helper function to push this window to the top
    const pushToTop = useCallback(() => {
      const { maxZIndexInUse, resetApplied } = getRecalculatedMaxZIndex();
      const nextZIndex = maxZIndexInUse + 1;
      if (resetApplied && windowRef.current) {
        windowRef.current.style.zIndex = `${nextZIndex}`;
      }
      setZIndex((currentZIndex) => {
        return resetApplied || currentZIndex <= maxZIndexInUse ? nextZIndex : currentZIndex;
      });
    }, [getRecalculatedMaxZIndex]);

    // DockPanels stack against floating windows using the z-index of their visible window
    const dockedEdge = dockedWindow?.edge ?? null;
    const activeDockedEdge = isDocked && isActiveDockedWindow ? dockedEdge : null;
    const setPanelZIndex = docking?.setPanelZIndex;
    const activationCount = docking?.getWindowActivationCount?.(id) ?? 0;
    const lastActivationCountRef = useRef<number>(activationCount);

    useEffect(() => {
      // Bring to front when explicitly activated in a panel (dock, side change, tab click),
      // but not when promoted automatically because another window left the panel
      if (activationCount !== lastActivationCountRef.current) {
        lastActivationCountRef.current = activationCount;
        if (isDocked) {
          pushToTop();
        }
      }
    }, [activationCount, isDocked, pushToTop]);

    useEffect(() => {
      if (activeDockedEdge) {
        setPanelZIndex?.(activeDockedEdge, zIndex);
      }
    }, [activeDockedEdge, setPanelZIndex, zIndex]);

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
        setIsDraggingForDock(true);
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
          setTargetSnapEdge(snapEdge);
          targetSnapEdgeRef.current = snapEdge;
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
        setTargetSnapEdge(null);
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
          handleDock(targetSnapEdgeRef.current, defaultStackDirection);
          isDocking = true;
        }

        setIsDraggingForDock(false);
        setTargetSnapEdge(null);
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
        dock: (edge: DockEdge, stackDirection: StackDirection) => {
          handleDock(edge, stackDirection);
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

    // Clear pre-dock state when undocking completes
    useEffect(() => {
      if (!isDocked && preDockState) {
        setPreDockState(null);
        preDockStateRef.current = null;
      }
    }, [isDocked, preDockState]);

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
        if (!isDockedRef.current) {
          docking.dock(id, initialDockEdge, defaultStackDirection);
        }
      }
    }, [visible, initialDockEdge, docking, id, defaultStackDirection]);

    useEffect(() => {
      if (visible && !windowInDOM) {
        // Window should be in DOM when visible becomes true
        startTransition(() => {
          setWindowInDOM(true);
        });
      } else if (!visible && windowInDOM) {
        // Window should leave DOM when visible becomes false
        startTransition(() => {
          setWindowInDOM(false);
          setWindowVisible(false);
        });
      }
    }, [visible, windowInDOM, startTransition]);

    useEffect(() => {
      const handleResetZIndex = (): void => {
        const sourceWindowId = document.body.getAttribute(CONTEXT_WINDOW_RESET_SOURCE_DATA_ATTR);
        if (sourceWindowId === id) {
          return;
        }
        setZIndex(minZIndex);
      };

      document.addEventListener(CONTEXT_WINDOW_RESET_EVENT, handleResetZIndex);
      return () => {
        document.removeEventListener(CONTEXT_WINDOW_RESET_EVENT, handleResetZIndex);
      };
    }, [id, minZIndex]);

    // Position and show window after it's added to DOM
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

        // Update z-index and make visible - use startTransition
        const { maxZIndexInUse, resetApplied } = getRecalculatedMaxZIndex();
        onOpen?.();
        startTransition(() => {
          const nextZIndex = maxZIndexInUse + 1;
          if (resetApplied && windowRef.current) {
            windowRef.current.style.zIndex = `${nextZIndex}`;
          }
          setZIndex((currentZIndex) => {
            return resetApplied || currentZIndex <= maxZIndexInUse ? nextZIndex : currentZIndex;
          });
          setWindowVisible(true);
        });
      }
    }, [getRecalculatedMaxZIndex, onOpen, startTransition, visible, windowInDOM, windowVisible]);

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
        setTargetSnapEdge(null);
      }
    }, [id, isDocked, isDraggingForDock, moving]);

    return (
      <div
        className={styles.contextWindowAnchor}
        ref={divRef}
      >
        {windowInDOM &&
          createPortal(
            <>
              <DockZoneIndicator
                targetEdge={targetSnapEdge}
                isDragging={isDraggingForDock}
              />
              <div
                {...rest}
                ref={windowRef}
                id={id}
                {...{ [CONTEXT_WINDOW_DATA_ATTR]: "true" }}
                {...{ [CONTEXT_WINDOW_MIN_Z_INDEX_DATA_ATTR]: `${minZIndex}` }}
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
                  display: isDocked
                    ? isActiveDockedWindow
                      ? "flex"
                      : "none"
                    : rest.style?.display,
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
                    docking?.setActiveWindowOnEdge?.(dockedWindow.edge, id);
                  }
                  pushToTop();
                  rest.onClickCapture?.(e);
                }}
              >
                <ContextWindowTitleBar
                  title={title}
                  titleElement={titleElement}
                  moving={moving}
                  onMouseDown={onMouseDown}
                  onDock={
                    dockable && !isDocked
                      ? () => handleDock("right", defaultStackDirection)
                      : undefined
                  }
                  onUndock={dockable && isDocked && allowUndock ? () => handleUndock() : undefined}
                  onClose={onClose}
                />
                <div className={styles.contextWindowBody}>
                  <div>{children}</div>
                </div>
              </div>
            </>,
            portalTarget,
          )}
      </div>
    );
  },
);

ContextWindow.displayName = "ContextWindow";
