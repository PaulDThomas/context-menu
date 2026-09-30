import styles from "./DockPanel.module.css";
import type { DockEdge } from "./interface";
import { useDocking } from "./useDocking";

interface DockPanelProps {
  edge: DockEdge;
}

export const DockPanel = ({ edge }: DockPanelProps): React.ReactElement | null => {
  const docking = useDocking();
  const windows = docking.getWindowsOnEdge(edge);

  if (windows.length === 0) {
    return null;
  }

  const containerClass = `${styles.dockPanel} ${styles[`edge-${edge}`]}`;

  return (
    <div className={containerClass}>
      {windows.map((window) => (
        <button
          key={window.id}
          className={styles.dockTabButton}
          onClick={() => docking.toggleCollapse(window.id)}
          title={`Toggle ${window.id}`}
        >
          {window.id}
        </button>
      ))}
    </div>
  );
};
