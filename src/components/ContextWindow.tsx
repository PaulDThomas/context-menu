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
import { useMouseMove } from "../functions/useMouseMove";
import styles from "./ContextWindow.module.css";
import { DockZoneIndicator } from "./DockZoneIndicator";
import { DockingContext } from "./DockingContext";
import type { DockEdge, StackDirection } from "./interface";

export const MIN_Z_INDEX = 3000;
export const MAX_Z_INDEX = 3010;
const CONTEXT_WINDOW_DATA_ATTR = "data-context-window";
const CONTEXT_WINDOW_MIN_Z_INDEX_DATA_ATTR = "data-context-window-min-z-index";
const CONTEXT_WINDOW_RESET_EVENT = "context-window-reset-z-index";
const CONTEXT_WINDOW_RESET_COUNTER_DATA_ATTR = "data-context-window-reset-counter";
const CONTEXT_WINDOW_RESET_SOURCE_DATA_ATTR = "data-context-window-reset-source";
const SNAP_THRESHOLD = 24;
const UNDOCK_THRESHOLD = 20;
const SNAP_HYSTERESIS = 40; // px threshold to UN-snap once snapped (larger than SNAP_THRESHOLD)

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

// Helper function to get the highest zIndex from all context windows in the DOM
const getMaxZIndex = (componentMinZIndex: number, currentWindow?: HTMLElement | null): number => {
  const windows = document.body.querySelectorAll(`[${CONTEXT_WINDOW_DATA_ATTR}]`);
  let maxZIndex = componentMinZIndex - 1;
  windows.forEach((win) => {
    if (currentWindow && win === currentWindow) {
      return;
    }
    const zIndexStr = (win as HTMLElement).style.zIndex;
    /* istanbul ignore else */
    if (zIndexStr) {
      const zIndex = parseInt(zIndexStr, 10);
      if (!isNaN(zIndex) && zIndex > maxZIndex) {
        maxZIndex = zIndex;
      }
    }
  });
  return maxZIndex;
};

const getWindowMinZIndex = (windowElement: HTMLElement, fallbackMinZIndex: number): number => {
  const minZIndexAttr = windowElement.getAttribute(CONTEXT_WINDOW_MIN_Z_INDEX_DATA_ATTR);
  const parsedMinZIndex = minZIndexAttr ? parseInt(minZIndexAttr, 10) : NaN;
  return Number.isNaN(parsedMinZIndex) ? fallbackMinZIndex : parsedMinZIndex;
};

const markBodyResetState = (sourceWindowId?: string): void => {
  const currentCounter = parseInt(
    document.body.getAttribute(CONTEXT_WINDOW_RESET_COUNTER_DATA_ATTR) ?? "0",
    10,
  );
  const nextCounter = Number.isNaN(currentCounter) ? 1 : currentCounter + 1;
  document.body.setAttribute(CONTEXT_WINDOW_RESET_COUNTER_DATA_ATTR, `${nextCounter}`);

  if (sourceWindowId) {
    document.body.setAttribute(CONTEXT_WINDOW_RESET_SOURCE_DATA_ATTR, sourceWindowId);
    return;
  }

  document.body.removeAttribute(CONTEXT_WINDOW_RESET_SOURCE_DATA_ATTR);
};

const resetAllWindowZIndexes = (fallbackMinZIndex: number, sourceWindowId?: string): void => {
  const windows = document.body.querySelectorAll(`[${CONTEXT_WINDOW_DATA_ATTR}]`);
  windows.forEach((win) => {
    const element = win as HTMLElement;
    element.style.zIndex = `${getWindowMinZIndex(element, fallbackMinZIndex)}`;
  });

  markBodyResetState(sourceWindowId);
  document.dispatchEvent(new Event(CONTEXT_WINDOW_RESET_EVENT));
};

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

    // Debug: track render cycles
    const renderCountRef = useRef<number>(0);
    renderCountRef.current++;

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
        console.log("🔴 handleDock CALLED:", {
          edge,
          stackDirection,
          isDocked,
          id,
          renderCount: renderCountRef.current,
          preDockState,
          targetSnapEdgeRef: targetSnapEdgeRef.current,
        });
        /* istanbul ignore next */
        if (!docking) return;
        if (!windowRef.current) {
          // Docking before the window node exists (e.g. from a mount effect): nothing to restore later
          docking.dock(id, edge, stackDirection);
          return;
        }

        const currentStyle = windowRef.current.style;
        console.log("handleDock - DETAILED POSITION INFO:", {
          rectLeft: windowRef.current.getBoundingClientRect().left,
          rectTop: windowRef.current.getBoundingClientRect().top,
          rectRight: windowRef.current.getBoundingClientRect().right,
          rectBottom: windowRef.current.getBoundingClientRect().bottom,
          rectWidth: windowRef.current.getBoundingClientRect().width,
          rectHeight: windowRef.current.getBoundingClientRect().height,
          styleLeft: currentStyle.left,
          styleTop: currentStyle.top,
          styleTransform: currentStyle.transform,
          windowPosX: windowPos.current.x,
          windowPosY: windowPos.current.y,
          windowVisible,
          isDocked,
          elementDisplay: window.getComputedStyle(windowRef.current).display,
          elementVisibility: window.getComputedStyle(windowRef.current).visibility,
          elementPosition: window.getComputedStyle(windowRef.current).position,
        });

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
      [docking, id, isDocked, preDockState, windowVisible],
    );

    const handleUndock = useCallback(
      (fromAction: boolean = false, pointer?: { x: number; y: number }) => {
        console.log("handleUndock called", { isDocked, id, preDockState, fromAction });
        /* istanbul ignore next */
        if (!docking || !isDocked) {
          console.log("handleUndock returning early - docking:", !!docking, "isDocked:", isDocked);
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
        console.log("handleUndock completed - undock() called");
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
        console.log("↓ Interaction started", {
          id,
          renderCount: renderCountRef.current,
          isDockedAtStart: isDockedAtStartRef.current,
        });
        windowPos.current = parseTranslate(windowRef.current?.style.transform);
        setMoving(true);
        setIsDraggingForDock(true);
        // If we're starting a drag, the window must be visible enough to interact with
        // Force windowVisible to true to enable onInteractionEnd firing
        /* c8 ignore next 3 */
        /* istanbul ignore next */
        /* babel ignore next */
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
        /* c8 ignore next 8 */
        /* istanbul ignore next */
        /* babel ignore next */
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
            handleUndock(false, { x: e.clientX, y: e.clientY });
            isDockedRef.current = false;
            return;
          }
        }

        move(e.movementX, e.movementY);
      },
      onMouseUp: () => {
        console.log("onMouseUp fired", {
          id,
          renderCount: renderCountRef.current,
          isDocked,
          targetSnapEdgeRef: targetSnapEdgeRef.current,
          isDraggingForDock,
          moving,
        });
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
          console.log("↑ Interaction ended (not involved in interaction)", {
            id,
            renderCount: renderCountRef.current,
          });
          return;
        }

        // Check if this interaction has already been processed to prevent duplicate fires
        /* c8 ignore next 4 */
        /* istanbul ignore next */
        /* babel ignore next */
        if (interactionProcessedRef.current) {
          console.log("↑ Interaction ended (duplicate, skipping)", {
            id,
            renderCount: renderCountRef.current,
          });
          return;
        }
        interactionProcessedRef.current = true;

        // Snap to dock on interaction end if we're near an edge
        // Use isDockedAtStartRef to avoid stale closures from re-renders during the same interaction
        console.log("↑ Interaction ended", {
          id,
          renderCount: renderCountRef.current,
          isDockedAtStart: isDockedAtStartRef.current,
          targetSnapEdgeRef: targetSnapEdgeRef.current,
        });

        // Dock if the window is floating at release (including a window that was undocked
        // earlier in this same drag) and the pointer is over a snap zone
        const isDockedNow = isDockedRef.current;
        let isDocking = false;
        if (!isDockedNow && dockable && docking && targetSnapEdgeRef.current) {
          console.log("✓ All conditions met - docking", {
            id,
            edge: targetSnapEdgeRef.current,
          });
          handleDock(targetSnapEdgeRef.current, defaultStackDirection);
          isDocking = true;
        } else if (!isDockedNow && dockable && docking) {
          console.log("✗ Docking blocked - no snap", {
            id,
            refIsNull: targetSnapEdgeRef.current === null,
          });
        } else if (isDockedNow) {
          console.log("✗ Interaction on docked window - skipping dock logic", {
            id,
            isDockedAtStart: isDockedAtStartRef.current,
          });
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

    // Log isDocked state changes for debugging
    useEffect(() => {
      console.log("isDocked state changed:", {
        isDocked,
        dockedWindow: dockedWindow
          ? { edge: dockedWindow.edge, stackDirection: dockedWindow.stackDirection }
          : null,
        id,
        renderCount: renderCountRef.current,
        targetSnapEdgeRefCurrent: targetSnapEdgeRef.current,
      });
      /* istanbul ignore next */
      if (isDocked) {
        console.log("⚠️ isDocked became true - stack trace marker");
      }
    }, [isDocked, dockedWindow, id]);

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
        console.log(
          "useEffect[isDocked] - isDocked became true, clearing floating styles after dock",
          {
            id,
            isDraggingForDock,
            moving,
            targetSnapEdgeRef: targetSnapEdgeRef.current,
          },
        );
        // Clear direct DOM style mutations that were set during floating state
        windowRef.current.style.left = "";
        windowRef.current.style.top = "";
        windowRef.current.style.transform = "";
        windowPos.current = { x: 0, y: 0 };
        // Also clear the snap edge ref since we've docked
        console.log("Clearing targetSnapEdgeRef due to isDocked=true");
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
                className={[
                  styles.contextWindow,
                  isDocked ? styles.docked : "",
                  isDocked
                    ? styles[
                        `docked${dockedWindow?.edge?.charAt(0).toUpperCase()}${dockedWindow?.edge?.slice(1)}`
                      ]
                    : "",
                  rest.className,
                ]
                  .filter((c) => c)
                  .join(" ")}
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
                  // left: isDocked ? undefined : (rest.style?.left as any),
                  // top: isDocked ? undefined : (rest.style?.top as any),
                  // right: isDocked ? undefined : (rest.style?.right as any),
                  // bottom: isDocked ? undefined : (rest.style?.bottom as any),
                  // transform: isDocked ? undefined : (rest.style?.transform as any),
                }}
                onClickCapture={(e) => {
                  if (isDocked && dockedWindow && activeDockedWindowId !== id) {
                    docking?.setActiveWindowOnEdge?.(dockedWindow.edge, id);
                  }
                  pushToTop();
                  rest.onClickCapture?.(e);
                }}
              >
                <div
                  className={[styles.contextWindowTitle, moving ? styles.moving : ""]
                    .filter((c) => c !== "")
                    .join(" ")}
                  onMouseDown={onMouseDown}
                >
                  <div
                    className={styles.contextWindowTitleText}
                    title={title}
                  >
                    {titleElement ? titleElement : title}
                  </div>
                  {dockable && !isDocked && (
                    <div
                      className={styles.dockButton}
                      role="button"
                      aria-label="Dock"
                      onClick={() => handleDock("right", defaultStackDirection)}
                      title={`Dock ${title && title.trim() !== "" ? title : "window"}`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        fill="currentColor"
                        viewBox="0 0 16 16"
                      >
                        <path d="M8 1H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h5V1zm5 0v12h-1V1h1z" />
                      </svg>
                    </div>
                  )}
                  {dockable && isDocked && allowUndock && (
                    <div
                      className={styles.undockButton}
                      role="button"
                      aria-label="Undock"
                      onClick={() => handleUndock(true)}
                      title={`Undock ${title && title.trim() !== "" ? title : "window"}`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        fill="currentColor"
                        viewBox="0 0 16 16"
                      >
                        <path d="M3 2.5a2.5 2.5 0 0 1 5 0 2.5 2.5 0 0 1 5 0v.006c0 .07 0 .27-.038.494H15a.5.5 0 0 1 0 1H1a.5.5 0 0 1 0-1h2.038A3 3 0 0 0 3 2.506V2.5zm2.68 1.022A1.5 1.5 0 0 0 3.5 3.5h9a1.5 1.5 0 0 0-2.18-1.478L8 5.5l-2.32-2.978z" />
                      </svg>
                    </div>
                  )}
                  <div
                    className={styles.contextWindowTitleClose}
                    role="button"
                    aria-label="Close"
                    onClick={onClose}
                    title={`Close ${title && title.trim() !== "" ? title : "window"}`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      fill="currentColor"
                      viewBox="0 0 16 16"
                    >
                      <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
                    </svg>
                  </div>
                </div>
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
