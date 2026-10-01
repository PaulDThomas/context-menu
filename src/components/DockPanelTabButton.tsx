import { classNames } from "../functions/classNames";
import { useDocking } from "../functions/useDocking";
import { ContextMenuHandler } from "./ContextMenuHandler";
import styles from "./DockPanel.module.css";
import type { DockEdge } from "./interface";

interface DockPanelTabButtonProps {
  windowId: string;
  edge: DockEdge;
  isActive: boolean;
}

export const DockPanelTabButton = ({
  windowId,
  edge,
  isActive,
}: DockPanelTabButtonProps): React.ReactElement => {
  const docking = useDocking();

  const showWindow = () => {
    if (docking.isEdgeCollapsed(edge)) {
      docking.toggleEdgeCollapse(edge);
    }
    docking.setActiveWindowOnEdge(edge, windowId);
  };

  return (
    <ContextMenuHandler
      menuItems={[
        { label: "Show", action: showWindow },
        { label: "Close", action: () => docking.closeWindow(windowId) },
        { label: "Undock", action: () => docking.requestUndock(windowId) },
      ]}
      style={{ display: "contents" }}
    >
      <button
        className={classNames(styles.dockTabButton, isActive && styles.activeDockTabButton)}
        onClick={showWindow}
        title={`Activate ${windowId}`}
      >
        {windowId}
      </button>
    </ContextMenuHandler>
  );
};
