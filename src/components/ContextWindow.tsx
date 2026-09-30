import {
  forwardRef,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
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
    const [targetSnapEdge, setTargetSnapEdge] = useState<DockEdge | null>(null);
    const targetSnapEdgeRef = useRef<DockEdge | null>(null);
    const [isDraggingForDock, setIsDraggingForDock] = useState<boolean>(false);
    const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

    // Capture isDocked state at interaction start to prevent stale closures during re-renders
    const isDockedAtStartRef = useRef<boolean>(false);
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
    const undockViaActionRef = useRef<boolean>(false);

    const move = useCallback(
      (x: number, y: number) => {
        if (windowRef.current && !isDocked) {
          windowPos.current.x += x;
          windowPos.current.y += y;
          windowRef.current.style.transform = `translate(${windowPos.current.x}px, ${windowPos.current.y}px)`;
        }
      },
      [isDocked],
    );

    // Snap-to-dock detection
    const detectSnapEdge = useCallback(
      (mouseX: number, mouseY: number, currentSnap: DockEdge | null): DockEdge | null => {
        if (!dockable || !docking || isDocked) {
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
      [dockable, docking, isDocked],
    );

    // Define fitToViewport before handleDock and handleUndock so they can use it
    const fitToViewport = useCallback(() => {
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
        if (!docking || !windowRef.current) return;

        // Save current position and dimensions before docking
        const rect = windowRef.current.getBoundingClientRect();
        const currentStyle = windowRef.current.style;
        console.log("handleDock - DETAILED POSITION INFO:", {
          rectLeft: rect.left,
          rectTop: rect.top,
          rectRight: rect.right,
          rectBottom: rect.bottom,
          rectWidth: rect.width,
          rectHeight: rect.height,
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

        // Use the already-set DOM left/top values since they're more reliable than getBoundingClientRect during transforms
        const leftStyle = currentStyle.left || "0px";
        const topStyle = currentStyle.top || "0px";
        const leftValue = parseFloat(leftStyle);
        const topValue = parseFloat(topStyle);

        console.log("handleDock - PARSED STYLES:", { leftValue, topValue, leftStyle, topStyle });

        // Save the position using DOM values + transform offset
        setPreDockState({
          x: leftValue + windowPos.current.x,
          y: topValue + windowPos.current.y,
          width: rect.width,
          height: rect.height,
        });

        docking.dock(id, edge, stackDirection);
      },
      [id, docking, windowVisible, isDocked],
    );

    const handleUndock = useCallback(
      (fromAction: boolean = false) => {
        console.log("handleUndock called", { isDocked, id, preDockState, fromAction });
        if (!docking || !isDocked) {
          console.log("handleUndock returning early - docking:", !!docking, "isDocked:", isDocked);
          return;
        }

        // Restore pre-dock position and dimensions
        if (preDockState && windowRef.current) {
          console.log("Restoring pre-dock state:", {
            preDockState,
            windowPosCurrent: windowPos.current,
          });
          // preDockState.x and preDockState.y already include the transform offset
          // So we can set them directly as left/top with no transform
          windowRef.current.style.left = `${preDockState.x}px`;
          windowRef.current.style.top = `${preDockState.y}px`;
          windowRef.current.style.transform = ""; // Clear transform
          windowRef.current.style.width = `${preDockState.width}px`;
          windowRef.current.style.height = `${preDockState.height}px`;
          windowPos.current = { x: 0, y: 0 };
          console.log("Restored styles:", {
            left: windowRef.current.style.left,
            top: windowRef.current.style.top,
            transform: windowRef.current.style.transform,
            width: windowRef.current.style.width,
            height: windowRef.current.style.height,
          });
        }

        // Mark if this was an action-based undock so useEffect can run checkPosition
        undockViaActionRef.current = fromAction;

        docking.undock(id);
        console.log("handleUndock completed - undock() called");
      },
      [id, docking, isDocked, preDockState],
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

    const parseTranslate = (transform?: string): { x: number; y: number } => {
      const match = transform?.match(/translate\((-?\d+(?:\.\d+)?)px,\s*(-?\d+(?:\.\d+)?)px\)/);
      if (match) {
        return {
          x: Number.parseFloat(match[1]),
          y: Number.parseFloat(match[2]),
        };
      }
      /* v8 ignore next */
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

        // Detect snap-to-dock
        if (!isDocked && dockable) {
          const snapEdge = detectSnapEdge(e.clientX, e.clientY, targetSnapEdgeRef.current);
          setTargetSnapEdge(snapEdge);
          targetSnapEdgeRef.current = snapEdge;
        }

        // Check for undock (if docked and dragged far from edge)
        if (isDocked && dockable && docking) {
          const edge = dockedWindow?.edge;
          let shouldUndock = false;

          if (edge === "top" && e.clientY > UNDOCK_THRESHOLD) shouldUndock = true;
          if (edge === "bottom" && e.clientY < window.innerHeight - UNDOCK_THRESHOLD)
            shouldUndock = true;
          if (edge === "left" && e.clientX > UNDOCK_THRESHOLD) shouldUndock = true;
          if (edge === "right" && e.clientX < window.innerWidth - UNDOCK_THRESHOLD)
            shouldUndock = true;

          if (shouldUndock) {
            handleUndock();

            // CRITICAL: Position window header center under mouse cursor for seamless drag continuation
            // After undocking, the window is at its pre-dock DOM position with transform cleared
            // We need to adjust the transform so the header center aligns with the current mouse position
            if (windowRef.current) {
              // Find the header element (has contextWindowTitle class)
              const headerElement = windowRef.current.querySelector(
                '[class*="contextWindowTitle"]',
              );

              if (headerElement) {
                const headerRect = headerElement.getBoundingClientRect();
                const headerCenterX = headerRect.left + headerRect.width / 2;
                const headerCenterY = headerRect.top + headerRect.height / 2;

                // Calculate offset from mouse to header center
                const offsetX = e.clientX - headerCenterX;
                const offsetY = e.clientY - headerCenterY;

                // Apply this offset to windowPos so the drag continues naturally from the mouse position
                windowPos.current.x = offsetX;
                windowPos.current.y = offsetY;
                windowRef.current.style.transform = `translate(${windowPos.current.x}px, ${windowPos.current.y}px)`;
              }
            }
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

        let isDocking = false;
        if (!isDockedAtStartRef.current && dockable && docking && targetSnapEdgeRef.current) {
          console.log("✓ All conditions met - docking", {
            id,
            edge: targetSnapEdgeRef.current,
          });
          handleDock(targetSnapEdgeRef.current, defaultStackDirection);
          isDocking = true;
        } else if (!isDockedAtStartRef.current && dockable && docking) {
          console.log("✗ Docking blocked - no snap", {
            id,
            refIsNull: targetSnapEdgeRef.current === null,
          });
        } else if (isDockedAtStartRef.current) {
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
        // Don't check position if we just docked, as the CSS classes will handle positioning
        if (!isDocking) {
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
      if (isDocked) {
        console.log("⚠️ isDocked became true - stack trace marker");
      }
    }, [isDocked, dockedWindow, id]);

    // Clear pre-dock state when undocking completes
    useEffect(() => {
      if (!isDocked && preDockState) {
        console.log("Undocking completed, clearing preDockState");
        // If undocking was triggered via action, run checkPosition to ensure window is on-screen
        if (undockViaActionRef.current) {
          console.log("Action-based undock completed - running checkPosition to fit to viewport");
          checkPosition();
          undockViaActionRef.current = false;
        }
        setPreDockState(null);
      }
    }, [isDocked, preDockState, checkPosition]);

    // Sync windowInDOM with visible prop using a layout effect to avoid ESLint warnings
    // This effect derives state from props, which is acceptable when there's no synchronous setState
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
        // Position the window
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
        if (windowPos && windowPos.current) {
          windowPos.current = {
            x: checkedPosition.translateX,
            y: checkedPosition.translateY,
          };
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
    }, [isDocked]);

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
                  zIndex: zIndex,
                  minHeight: isDocked ? "auto" : (rest.style?.minHeight ?? "150px"),
                  minWidth: isDocked ? "auto" : (rest.style?.minWidth ?? "200px"),
                  maxHeight: isDocked
                    ? dockedWindow?.edge === "top" || dockedWindow?.edge === "bottom"
                      ? "auto"
                      : "100%"
                    : (rest.style?.maxHeight ?? "1000px"),
                  maxWidth: isDocked
                    ? dockedWindow?.edge === "left" || dockedWindow?.edge === "right"
                      ? "auto"
                      : "100%"
                    : (rest.style?.maxWidth ?? "1000px"),
                  width: isDocked
                    ? dockedWindow?.edge === "top" || dockedWindow?.edge === "bottom"
                      ? "100%"
                      : "auto"
                    : rest.style?.width,
                  height: isDocked
                    ? dockedWindow?.edge === "left" || dockedWindow?.edge === "right"
                      ? "100%"
                      : "auto"
                    : rest.style?.height,
                  // left: isDocked ? undefined : (rest.style?.left as any),
                  // top: isDocked ? undefined : (rest.style?.top as any),
                  // right: isDocked ? undefined : (rest.style?.right as any),
                  // bottom: isDocked ? undefined : (rest.style?.bottom as any),
                  // transform: isDocked ? undefined : (rest.style?.transform as any),
                }}
                onClickCapture={(e) => {
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
                  {dockable && isDocked && (
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
            document.body,
          )}
      </div>
    );
  },
);

ContextWindow.displayName = "ContextWindow";
