import { classNames, useDocking } from "../functions";
import styles from "./ContextWindow.module.css";
import { ContextWindowTitleButton } from "./ContextWindowTitleButton";
import { CloseIcon, DockIcon, UndockIcon } from "./icons";

interface ContextWindowTitleBarProps {
  id: string;
}

export const ContextWindowTitleBar = ({ id }: ContextWindowTitleBarProps): React.ReactElement => {
  const docking = useDocking();
  const { onMouseDown, moving, title, titleElement, onDock, onUndock } =
    docking.getWindowConfig(id);
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
        onClick={() => docking.closeWindow(id)}
      >
        <CloseIcon />
      </ContextWindowTitleButton>
    </div>
  );
};
