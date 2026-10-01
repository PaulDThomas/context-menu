import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./DockPanel.module.css";
import type { DockEdge } from "./interface";
import { useDocking } from "./useDocking";

interface DockPanelProps {
  edge: DockEdge;
}

export const DOCK_PANEL_MIN_SIZE = 80;
// A pinned panel auto-hides once the pointer is further than this from its button bar
export const DOCK_PANEL_AUTOHIDE_DISTANCE = 48;
// Space always left free between the panel's inner edge and the opposite side of the viewport
export const DOCK_PANEL_VIEWPORT_GAP = 40;
const KEYBOARD_STEP = 10;
const KEYBOARD_LARGE_STEP = 50;

const isHorizontalEdge = (edge: DockEdge): boolean => edge === "left" || edge === "right";

const clampPanelSize = (edge: DockEdge, size: number): number => {
  const viewport = isHorizontalEdge(edge) ? window.innerWidth : window.innerHeight;
  const max = Math.max(DOCK_PANEL_MIN_SIZE, viewport - DOCK_PANEL_VIEWPORT_GAP);
  return Math.round(Math.min(max, Math.max(DOCK_PANEL_MIN_SIZE, size)));
};

// Moving the pointer towards the viewport centre grows the panel
const sizeDelta = (edge: DockEdge, dx: number, dy: number): number => {
  switch (edge) {
    case "left":
      return dx;
    case "right":
      return -dx;
    case "top":
      return dy;
    case "bottom":
      return -dy;
  }
};

export const DockPanel = ({ edge }: DockPanelProps): React.ReactElement | null => {
  const docking = useDocking();
  const windows = docking.getWindowsOnEdge(edge);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const contentHostRef = useRef<HTMLDivElement | null>(null);
  const setPanelContentHost = docking.setPanelContentHost;
  // Kept while the panel is empty so the chosen size is reused when a window docks again
  const [panelSize, setPanelSize] = useState<number | null>(null);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const resizeCleanupRef = useRef<(() => void) | null>(null);

  const getCurrentSize = useCallback((): number => {
    /* istanbul ignore next */
    if (!panelRef.current) {
      return DOCK_PANEL_MIN_SIZE;
    }
    const rect = panelRef.current.getBoundingClientRect();
    return isHorizontalEdge(edge) ? rect.width : rect.height;
  }, [edge]);

  const getActiveWindowOnEdge = docking.getActiveWindowOnEdge;
  const setActiveWindowOnEdge = docking.setActiveWindowOnEdge;

  // Interacting with the handle raises the panel, matching a click on the docked window itself
  const bringPanelToTop = useCallback(() => {
    const activeId = getActiveWindowOnEdge?.(edge) ?? windows[0]?.id ?? null;
    if (activeId) {
      setActiveWindowOnEdge?.(edge, activeId);
    }
  }, [edge, getActiveWindowOnEdge, setActiveWindowOnEdge, windows]);

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button !== 0) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      bringPanelToTop();

      const startX = e.clientX;
      const startY = e.clientY;
      const startSize = getCurrentSize();
      const previousCursor = document.body.style.cursor;
      const previousUserSelect = document.body.style.userSelect;
      document.body.style.cursor = isHorizontalEdge(edge) ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";
      setIsResizing(true);

      const onMouseMove = (moveEvent: MouseEvent) => {
        const delta = sizeDelta(edge, moveEvent.clientX - startX, moveEvent.clientY - startY);
        setPanelSize(clampPanelSize(edge, startSize + delta));
      };

      const cleanup = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", cleanup);
        document.body.style.cursor = previousCursor;
        document.body.style.userSelect = previousUserSelect;
        resizeCleanupRef.current = null;
        setIsResizing(false);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", cleanup);
      resizeCleanupRef.current = cleanup;
    },
    [bringPanelToTop, edge, getCurrentSize],
  );

  const handleResizeKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const step = e.shiftKey ? KEYBOARD_LARGE_STEP : KEYBOARD_STEP;
      const keyDeltas: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      };
      const keyDelta = keyDeltas[e.key];
      if (!keyDelta) {
        return;
      }
      const delta = sizeDelta(edge, keyDelta[0], keyDelta[1]);
      if (delta === 0) {
        return;
      }
      e.preventDefault();
      bringPanelToTop();
      setPanelSize(clampPanelSize(edge, getCurrentSize() + delta));
    },
    [bringPanelToTop, edge, getCurrentSize],
  );

  // Release document listeners if the panel unmounts mid-resize
  useEffect(() => {
    return () => {
      resizeCleanupRef.current?.();
    };
  }, []);

  useEffect(() => {
    if (!setPanelContentHost) {
      return;
    }

    setPanelContentHost(edge, contentHostRef.current);

    return () => {
      setPanelContentHost(edge, null);
    };
  }, [edge, setPanelContentHost, windows.length]);

  const isPinned = windows.length > 0 && docking.isEdgeCollapsed(edge);
  // A pinned bar slides away to a thin line once the pointer moves away from it
  const [isAutoHidden, setIsAutoHidden] = useState<boolean>(false);

  useEffect(() => {
    if (!isPinned) {
      return;
    }
    const handlePointerMove = (e: MouseEvent) => {
      const panel = panelRef.current;
      /* istanbul ignore next */
      if (!panel) {
        return;
      }
      // Measured as rendered: the full bar while shown, just the edge line while hidden
      const rect = panel.getBoundingClientRect();
      const dx = Math.max(rect.left - e.clientX, 0, e.clientX - rect.right);
      const dy = Math.max(rect.top - e.clientY, 0, e.clientY - rect.bottom);
      setIsAutoHidden(Math.hypot(dx, dy) > DOCK_PANEL_AUTOHIDE_DISTANCE);
    };
    // Leaving the window counts as moving away
    const handlePointerLeave = (e: MouseEvent) => {
      if (e.relatedTarget === null) {
        setIsAutoHidden(true);
      }
    };
    document.addEventListener("mousemove", handlePointerMove);
    document.addEventListener("mouseout", handlePointerLeave);
    return () => {
      document.removeEventListener("mousemove", handlePointerMove);
      document.removeEventListener("mouseout", handlePointerLeave);
    };
  }, [isPinned]);

  if (windows.length === 0) {
    return null;
  }

  const autoHidden = isPinned && isAutoHidden;
  const containerClass = [
    styles.dockPanel,
    styles[`edge-${edge}`],
    isPinned ? styles.pinned : "",
    autoHidden ? styles.autoHidden : "",
  ]
    .filter((className) => className !== "")
    .join(" ");
  const activeWindowId = docking.getActiveWindowOnEdge?.(edge) ?? windows[0]?.id ?? null;
  // Panels stack with floating windows using the z-index of their visible (active) window
  const panelZIndex = docking.getPanelZIndex?.(edge) ?? undefined;
  const horizontal = isHorizontalEdge(edge);
  const sizeStyle: React.CSSProperties =
    panelSize === null || isPinned
      ? {}
      : horizontal
        ? { width: panelSize, maxWidth: `calc(100vw - ${DOCK_PANEL_VIEWPORT_GAP}px)` }
        : { height: panelSize, maxHeight: `calc(100vh - ${DOCK_PANEL_VIEWPORT_GAP}px)` };

  const togglePinned = () => {
    // The pointer is on the pin button, so a freshly pinned bar starts shown
    setIsAutoHidden(false);
    docking.toggleEdgeCollapse(edge);
    bringPanelToTop();
  };

  const activateWindow = (id: string) => {
    // Choosing a window from a pinned bar shows its contents again
    if (isPinned) {
      docking.toggleEdgeCollapse(edge);
    }
    docking.setActiveWindowOnEdge?.(edge, id);
  };

  return (
    <div
      ref={panelRef}
      className={containerClass}
      style={{ zIndex: panelZIndex, ...sizeStyle }}
    >
      {!isPinned && (
        <div
          className={[
            styles.resizeHandle,
            styles[`resizeHandle-${edge}`],
            isResizing ? styles.resizeHandleActive : "",
          ]
            .filter((className) => className !== "")
            .join(" ")}
          role="separator"
          aria-orientation={horizontal ? "vertical" : "horizontal"}
          aria-label={`Resize ${edge} dock panel`}
          aria-valuemin={DOCK_PANEL_MIN_SIZE}
          aria-valuenow={panelSize ?? undefined}
          tabIndex={0}
          onMouseDown={handleResizeMouseDown}
          onKeyDown={handleResizeKeyDown}
        />
      )}
      {/* Kept mounted while pinned so the docked window isn't remounted */}
      <div
        ref={contentHostRef}
        className={styles.dockPanelContent}
        hidden={isPinned}
      />
      <div className={styles.dockPanelTabs}>
        <button
          className={[styles.dockPinButton, isPinned ? styles.dockPinButtonPinned : ""]
            .filter((className) => className !== "")
            .join(" ")}
          aria-pressed={isPinned}
          aria-label={isPinned ? `Unpin ${edge} dock panel` : `Pin ${edge} dock panel`}
          title={isPinned ? "Unpin: show window contents" : "Pin: hide window contents"}
          onClick={togglePinned}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            fill="currentColor"
            viewBox="0 0 16 16"
            aria-hidden="true"
          >
            <path d="M4.146.146A.5.5 0 0 1 4.5 0h7a.5.5 0 0 1 .5.5c0 .68-.342 1.174-.646 1.479-.126.125-.25.224-.354.298v4.431l.078.048c.203.127.476.314.751.555C12.36 7.775 13 8.527 13 9.5a.5.5 0 0 1-.5.5h-4v4.5c0 .276-.224 1.5-.5 1.5s-.5-1.224-.5-1.5V10h-4a.5.5 0 0 1-.5-.5c0-.973.64-1.725 1.17-2.189A6 6 0 0 1 5 6.708V2.277a3 3 0 0 1-.354-.298C4.342 1.674 4 1.179 4 .5a.5.5 0 0 1 .146-.354z" />
          </svg>
        </button>
        {windows.map((window) => {
          const isActive = window.id === activeWindowId;
          return (
            <button
              key={window.id}
              className={[styles.dockTabButton, isActive ? styles.activeDockTabButton : ""]
                .filter((className) => className !== "")
                .join(" ")}
              onClick={() => activateWindow(window.id)}
              title={`Activate ${window.id}`}
            >
              {window.id}
            </button>
          );
        })}
      </div>
    </div>
  );
};
