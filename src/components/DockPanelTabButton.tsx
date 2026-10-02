import { useContext } from "react";
import { classNames, useDocking } from "../functions";
import { ContextMenuHandler } from "./ContextMenuHandler";
import { DockingContext } from "./DockingContext";
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
  const dockingContext = useContext(DockingContext);
  const windowConfig = dockingContext?.getWindowConfig(windowId);
  const windowTitle = windowConfig?.title ?? windowId;

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
