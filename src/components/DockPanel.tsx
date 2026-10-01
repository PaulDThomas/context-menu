import { useCallback, useEffect, useRef } from "react";
import { classNames } from "../functions/classNames";
import {
  DOCK_PANEL_AUTOHIDE_DISTANCE,
  DOCK_PANEL_MIN_SIZE,
  DOCK_PANEL_VIEWPORT_GAP,
} from "../functions/dockPanelConstants";
import { isHorizontalEdge } from "../functions/isHorizontalEdge";
import { useAutoHide } from "../functions/useAutoHide";
import { useDocking } from "../functions/useDocking";
import { useDockPanelResize } from "../functions/useDockPanelResize";
import styles from "./DockPanel.module.css";
import { DockPanelPinButton } from "./DockPanelPinButton";
import { DockPanelTabButton } from "./DockPanelTabButton";
import type { DockEdge } from "./interface";

export { DOCK_PANEL_AUTOHIDE_DISTANCE, DOCK_PANEL_MIN_SIZE, DOCK_PANEL_VIEWPORT_GAP };

interface DockPanelProps {
  edge: DockEdge;
}

export const DockPanel = ({ edge }: DockPanelProps): React.ReactElement | null => {
  const docking = useDocking();
  const windows = docking.getWindowsOnEdge(edge);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const contentHostRef = useRef<HTMLDivElement | null>(null);
  const setPanelContentHost = docking.setPanelContentHost;
  const getActiveWindowOnEdge = docking.getActiveWindowOnEdge;

  // Interacting with the handle raises the panel, matching a click on the docked window itself
  const bringPanelToTop = useCallback(() => {
    docking.activateWindowOnEdge(edge);
  }, [edge, docking]);

  // The chosen size is kept while the panel is empty so it is reused when a window docks again
  const { panelSize, isResizing, handleResizeMouseDown, handleResizeKeyDown } = useDockPanelResize(
    edge,
    panelRef,
    bringPanelToTop,
  );

  useEffect(() => {
    setPanelContentHost(edge, contentHostRef.current);

    return () => {
      setPanelContentHost(edge, null);
    };
  }, [edge, setPanelContentHost, windows.length]);

  const isPinned = windows.length > 0 && docking.isEdgeCollapsed(edge);
  // A pinned bar slides away to a thin line once the pointer moves away from it
  const [autoHidden, setAutoHidden] = useAutoHide(isPinned, panelRef);

  if (windows.length === 0) {
    return null;
  }

  const activeWindowId =
    getActiveWindowOnEdge(edge) ??
    windows[0]?.id ??
    // istanbul ignore next
    null;
  // Panels stack with floating windows using the z-index of their visible (active) window
  const panelZIndex = docking.getPanelZIndex(edge) ?? undefined;
  const horizontal = isHorizontalEdge(edge);
  const sizeStyle: React.CSSProperties =
    panelSize === null || isPinned
      ? {}
      : horizontal
        ? { width: panelSize, maxWidth: `calc(100vw - ${DOCK_PANEL_VIEWPORT_GAP}px)` }
        : { height: panelSize, maxHeight: `calc(100vh - ${DOCK_PANEL_VIEWPORT_GAP}px)` };

  const togglePinned = () => {
    // The pointer is on the pin button, so a freshly pinned bar starts shown
    setAutoHidden(false);
    docking.toggleAndRaiseEdge(edge);
  };

  return (
    <div
      ref={panelRef}
      className={classNames(
        styles.dockPanel,
        styles[`edge-${edge}`],
        isPinned && styles.pinned,
        autoHidden && styles.autoHidden,
      )}
      style={{ zIndex: panelZIndex, ...sizeStyle }}
    >
      {!isPinned && (
        <div
          className={classNames(
            styles.resizeHandle,
            styles[`resizeHandle-${edge}`],
            isResizing && styles.resizeHandleActive,
          )}
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
        <DockPanelPinButton
          edge={edge}
          isPinned={isPinned}
          onClick={togglePinned}
        />
        {windows.map((window) => (
          <DockPanelTabButton
            key={window.id}
            windowId={window.id}
            edge={edge}
            isActive={window.id === activeWindowId}
          />
        ))}
      </div>
    </div>
  );
};
