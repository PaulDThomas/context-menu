import { classNames } from "../functions/classNames";
import { useDocking } from "../functions/useDocking";
import styles from "./ContextWindow.module.css";
import { ContextWindowTitleButton } from "./ContextWindowTitleButton";
import { CloseIcon, DockIcon, UndockIcon } from "./icons";

interface ContextWindowTitleBarProps {
  id: string;
}

export const ContextWindowTitleBar = ({ id }: ContextWindowTitleBarProps): React.ReactElement => {
  const docking = useDocking();
  const windowConfig = docking.getWindowConfig(id);

  if (!windowConfig) {
    throw new Error(`Window config not found for id: ${id}`);
  }

  const title = windowConfig.title ?? "";
  const titleElement = windowConfig.titleElement;
  const windowLabel = title && title.trim() !== "" ? title : "window";

  const handleClose = (): void => {
    docking.closeWindow(id);
  };

  return (
    <div
      className={classNames(styles.contextWindowTitle, windowConfig.moving && styles.moving)}
      onMouseDown={windowConfig.onMouseDown}
    >
      <div
        className={styles.contextWindowTitleText}
        title={title}
      >
        {titleElement ? titleElement : title}
      </div>
      {windowConfig.onDock && (
        <ContextWindowTitleButton
          className={styles.dockButton}
          label="Dock"
          title={`Dock ${windowLabel}`}
          onClick={windowConfig.onDock}
        >
          <DockIcon size={14} />
        </ContextWindowTitleButton>
      )}
      {windowConfig.onUndock && (
        <ContextWindowTitleButton
          className={styles.undockButton}
          label="Undock"
          title={`Undock ${windowLabel}`}
          onClick={windowConfig.onUndock}
        >
          <UndockIcon size={14} />
        </ContextWindowTitleButton>
      )}
      <ContextWindowTitleButton
        className={styles.contextWindowTitleClose}
        label="Close"
        title={`Close ${windowLabel}`}
        onClick={handleClose}
      >
        <CloseIcon />
      </ContextWindowTitleButton>
    </div>
  );
};
