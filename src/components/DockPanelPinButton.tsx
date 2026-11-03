import { classNames } from "../functions";
import styles from "./DockPanel.module.css";
import { PinIcon } from "./icons";
import type { DockEdge } from "./interface";

interface DockPanelPinButtonProps {
  edge: DockEdge;
  isPinned: boolean;
  onClick: () => void;
}

export const DockPanelPinButton = ({
  edge,
  isPinned,
  onClick,
}: DockPanelPinButtonProps): React.ReactElement => (
  <button
    className={classNames(styles.dockPinButton, isPinned && styles.dockPinButtonPinned)}
    aria-pressed={isPinned}
    aria-label={isPinned ? `Unpin ${edge} dock panel` : `Pin ${edge} dock panel`}
    title={isPinned ? "Unpin: show window contents" : "Pin: hide window contents"}
    onClick={onClick}
  >
    <PinIcon size={12} />
  </button>
);
