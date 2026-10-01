import { classNames } from "../functions/classNames";
import styles from "./DockPanel.module.css";

interface DockPanelTabButtonProps {
  windowId: string;
  isActive: boolean;
  onClick: () => void;
}

export const DockPanelTabButton = ({
  windowId,
  isActive,
  onClick,
}: DockPanelTabButtonProps): React.ReactElement => (
  <button
    className={classNames(styles.dockTabButton, isActive && styles.activeDockTabButton)}
    onClick={onClick}
    title={`Activate ${windowId}`}
  >
    {windowId}
  </button>
);
