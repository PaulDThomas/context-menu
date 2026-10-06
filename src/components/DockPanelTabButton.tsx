import { classNames, useDocking } from "../functions";
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
  const dispatch = docking.dispatch;
  const windowTitle = docking.getWindowConfig(windowId).title;

  const showWindow = () => {
    dispatch({ type: "activateWindowOnEdge", edge, id: windowId });
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
        title={`Activate ${windowTitle}`}
      >
        {windowTitle}
      </button>
    </ContextMenuHandler>
  );
};
