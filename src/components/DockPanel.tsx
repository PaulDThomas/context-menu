import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  classNames,
  DOCK_PANEL_AUTOHIDE_DISTANCE,
  DOCK_PANEL_MIN_SIZE,
  DOCK_PANEL_VIEWPORT_GAP,
  isHorizontalEdge,
  useAutoHide,
  useDocking,
  useDockPanelResize,
} from "../functions";
import styles from "./DockPanel.module.css";
import { DockPanelPinButton } from "./DockPanelPinButton";
import { DockPanelTabButton } from "./DockPanelTabButton";
import { CoverContentIcon, PushContentIcon } from "./icons";
import type { DockEdge } from "./interface";

export { DOCK_PANEL_AUTOHIDE_DISTANCE, DOCK_PANEL_MIN_SIZE, DOCK_PANEL_VIEWPORT_GAP };

export interface DockPanelSettings {
  size: number | null;
  pushContent: boolean;
}

interface DockPanelProps {
  edge: DockEdge;
  initialSettings?: DockPanelSettings;
  onSettingsChange?: (edge: DockEdge, settings: DockPanelSettings) => void;
}

export const DockPanel = ({
  edge,
  initialSettings,
  onSettingsChange,
}: DockPanelProps): React.ReactElement | null => {
  const docking = useDocking();
  const dispatch = docking.dispatch;
  const windows = docking.getWindowsOnEdge(edge);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const contentHostRef = useRef<HTMLDivElement | null>(null);
  const [pushContent, setPushContent] = useState(initialSettings?.pushContent ?? false);
  const getActiveWindowOnEdge = docking.getActiveWindowOnEdge;

  // The chosen size is kept while the panel is empty so it is reused when a window docks again
  const { panelSize, isResizing, handleResizeMouseDown, handleResizeKeyDown } = useDockPanelResize(
    edge,
    panelRef,
    () => dispatch({ type: "activateWindowOnEdge", edge }),
    initialSettings?.size ?? null,
  );

  useEffect(() => {
    if (!isResizing) {
      onSettingsChange?.(edge, { size: panelSize, pushContent });
    }
  }, [edge, isResizing, onSettingsChange, panelSize, pushContent]);

  useEffect(() => {
    dispatch({ type: "setPanelContentHost", edge, host: contentHostRef.current });

    return () => {
      dispatch({ type: "setPanelContentHost", edge, host: null });
    };
  }, [dispatch, edge, windows.length]);

  const isPinned = windows.length > 0 && docking.isEdgeCollapsed(edge);
  // A pinned bar slides away to a thin line once the pointer moves away from it
  const [autoHidden, setAutoHidden] = useAutoHide(isPinned, panelRef);
  const hasWindows = windows.length > 0;

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!pushContent || isPinned || !hasWindows || !panel) {
      return;
    }

    const bodyStyle = document.body.style;
    const paddingProperty = `padding-${edge}`;
    const insetProperty = `--dock-panel-inset-${edge}`;
    const originalPadding = bodyStyle.getPropertyValue(paddingProperty);
    const originalPaddingPriority = bodyStyle.getPropertyPriority(paddingProperty);
    const originalInset = bodyStyle.getPropertyValue(insetProperty);
    const originalInsetPriority = bodyStyle.getPropertyPriority(insetProperty);
    const basePadding =
      parseFloat(getComputedStyle(document.body).getPropertyValue(paddingProperty)) || 0;

    const updateInset = () => {
      const rect = panel.getBoundingClientRect();
      const size = isHorizontalEdge(edge) ? rect.width : rect.height;
      bodyStyle.setProperty(paddingProperty, `${basePadding + size}px`);
      bodyStyle.setProperty(insetProperty, `${size}px`);
    };

    updateInset();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateInset);
    observer?.observe(panel);
    window.addEventListener("resize", updateInset);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateInset);
      bodyStyle.setProperty(paddingProperty, originalPadding, originalPaddingPriority);
      bodyStyle.setProperty(insetProperty, originalInset, originalInsetPriority);
    };
  }, [edge, hasWindows, isPinned, panelSize, pushContent]);

  if (windows.length === 0) {
    return null;
  }

  const activeWindowId = getActiveWindowOnEdge(edge) ?? windows[0].id;
  // Panels stack with floating windows using the z-index of their visible (active) window
  const panelZIndex = docking.getPanelZIndex(edge) ?? undefined;
  const horizontal = isHorizontalEdge(edge);
  const sizeStyle: React.CSSProperties =
    panelSize === null || isPinned
      ? {}
      : horizontal
        ? { width: panelSize, maxWidth: `calc(100vw - ${DOCK_PANEL_VIEWPORT_GAP}px)` }
        : { height: panelSize, maxHeight: `calc(100vh - ${DOCK_PANEL_VIEWPORT_GAP}px)` };

  return (
    <div
      ref={panelRef}
      data-dock-panel-edge={edge}
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
          onClick={() => {
            // The pointer is on the pin button, so a freshly pinned bar starts shown
            setAutoHidden(false);
            dispatch({ type: "toggleAndRaiseEdge", edge });
          }}
        />
        <button
          type="button"
          className={classNames(
            styles.dockLayoutButton,
            pushContent && styles.dockLayoutButtonActive,
          )}
          aria-pressed={pushContent}
          aria-label={`Push content with ${edge} dock panel`}
          title={pushContent ? "Cover content" : "Push content"}
          onClick={() => setPushContent((previous) => !previous)}
        >
          {pushContent ? (
            <CoverContentIcon
              size={12}
              edge={edge}
            />
          ) : (
            <PushContentIcon
              size={12}
              edge={edge}
            />
          )}
        </button>
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
