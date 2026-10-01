import { ReactNode } from "react";
import { classNames } from "../functions/classNames";
import styles from "./ContextWindow.module.css";
import { ContextWindowTitleButton } from "./ContextWindowTitleButton";
import { CloseIcon, DockIcon, UndockIcon } from "./icons";

interface ContextWindowTitleBarProps {
  title: string;
  titleElement?: ReactNode;
  moving: boolean;
  onMouseDown: (e: React.MouseEvent<HTMLElement>) => void;
  /** Shows the Dock button when set */
  onDock?: () => void;
  /** Shows the Undock button when set */
  onUndock?: () => void;
  onClose?: () => void;
}

export const ContextWindowTitleBar = ({
  title,
  titleElement,
  moving,
  onMouseDown,
  onDock,
  onUndock,
  onClose,
}: ContextWindowTitleBarProps): React.ReactElement => {
  const windowLabel = title && title.trim() !== "" ? title : "window";
  return (
    <div
      className={classNames(styles.contextWindowTitle, moving && styles.moving)}
      onMouseDown={onMouseDown}
    >
      <div
        className={styles.contextWindowTitleText}
        title={title}
      >
        {titleElement ? titleElement : title}
      </div>
      {onDock && (
        <ContextWindowTitleButton
          className={styles.dockButton}
          label="Dock"
          title={`Dock ${windowLabel}`}
          onClick={onDock}
        >
          <DockIcon size={14} />
        </ContextWindowTitleButton>
      )}
      {onUndock && (
        <ContextWindowTitleButton
          className={styles.undockButton}
          label="Undock"
          title={`Undock ${windowLabel}`}
          onClick={onUndock}
        >
          <UndockIcon size={14} />
        </ContextWindowTitleButton>
      )}
      <ContextWindowTitleButton
        className={styles.contextWindowTitleClose}
        label="Close"
        title={`Close ${windowLabel}`}
        onClick={onClose}
      >
        <CloseIcon />
      </ContextWindowTitleButton>
    </div>
  );
};
