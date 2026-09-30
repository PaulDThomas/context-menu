import { useEffect, useRef } from "react";
import styles from "./DockPanel.module.css";
import type { DockEdge } from "./interface";
import { useDocking } from "./useDocking";

interface DockPanelProps {
  edge: DockEdge;
}

export const DockPanel = ({ edge }: DockPanelProps): React.ReactElement | null => {
  const docking = useDocking();
  const windows = docking.getWindowsOnEdge(edge);
  const contentHostRef = useRef<HTMLDivElement | null>(null);
  const setPanelContentHost = docking.setPanelContentHost;

  useEffect(() => {
    if (!setPanelContentHost) {
      return;
    }

    setPanelContentHost(edge, contentHostRef.current);

    return () => {
      setPanelContentHost(edge, null);
    };
  }, [edge, setPanelContentHost, windows.length]);

  if (windows.length === 0) {
    return null;
  }

  const containerClass = `${styles.dockPanel} ${styles[`edge-${edge}`]}`;
  const activeWindowId = docking.getActiveWindowOnEdge?.(edge) ?? windows[0]?.id ?? null;

  return (
    <div className={containerClass}>
      <div
        ref={contentHostRef}
        className={styles.dockPanelContent}
      />
      <div className={styles.dockPanelTabs}>
        {windows.map((window) => {
          const isActive = window.id === activeWindowId;
          return (
            <button
              key={window.id}
              className={[styles.dockTabButton, isActive ? styles.activeDockTabButton : ""]
                .filter((className) => className !== "")
                .join(" ")}
              onClick={() => docking.setActiveWindowOnEdge?.(edge, window.id)}
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
