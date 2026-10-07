import { classNames, useDocking } from "../functions";
import styles from "./ContextWindow.module.css";
import { ContextWindowTitleButton } from "./ContextWindowTitleButton";
import { CloseIcon, DockIcon, UndockIcon } from "./icons";
const noop = (): void => undefined;

interface ContextWindowTitleBarProps {
  id: string;
}

export const ContextWindowTitleBar = ({ id }: ContextWindowTitleBarProps): React.ReactElement => {
  const docking = useDocking();
  const config = docking.getWindowConfig(id);
  const {
    onMouseDown,
    moving,
    title,
    titleElement,
    onDock,
    onUndock,
    canDock,
    canUndock,
    canClose,
  } = config;
  const windowLabel = title && title.trim() !== "" ? title : "window";
  const undockDisabled = config.allowUndock === false && !!docking.getDockedWindow(id);

  return (
    <div
      className={classNames(
        styles.contextWindowTitle,
        moving && styles.moving,
        undockDisabled && styles.undockDisabled,
      )}
      onMouseDown={onMouseDown}
    >
      <div
        className={styles.contextWindowTitleText}
        title={title}
      >
        {titleElement ? titleElement : title}
      </div>
      {canDock && (
        <ContextWindowTitleButton
          className={styles.dockButton}
          label="Dock"
          title={`Dock ${windowLabel}`}
          onClick={onDock ?? noop}
        >
          <DockIcon size={14} />
        </ContextWindowTitleButton>
      )}
      {canUndock && (
        <ContextWindowTitleButton
          className={styles.undockButton}
          label="Undock"
          title={`Undock ${windowLabel}`}
          onClick={onUndock ?? noop}
        >
          <UndockIcon size={14} />
        </ContextWindowTitleButton>
      )}
      {canClose && (
        <ContextWindowTitleButton
          className={styles.contextWindowTitleClose}
          label="Close"
          title={`Close ${windowLabel}`}
          onClick={() => docking.closeWindow(id)}
        >
          <CloseIcon />
        </ContextWindowTitleButton>
      )}
    </div>
  );
};
