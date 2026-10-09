import { classNames } from "../functions";
import styles from "./ContextWindow.module.css";
import { ContextWindowTitleButton } from "./ContextWindowTitleButton";
import { CloseIcon, DockIcon, UndockIcon } from "./icons";
import type { ContextWindowController } from "./interface";

interface ContextWindowTitleBarProps {
  window: Pick<
    ContextWindowController,
    "windowConfig" | "isDocked" | "onTitleMouseDown" | "onDock" | "onUndock" | "onClose"
  >;
}

export const ContextWindowTitleBar = ({
  window,
}: ContextWindowTitleBarProps): React.ReactElement => {
  const config = window.windowConfig;
  const {
    defaultDockEdge = "right",
    moving,
    title,
    titleBarButtons,
    titleElement,
    canDock,
    canUndock,
    canClose,
  } = config;
  const windowLabel = title && title.trim() !== "" ? title : "window";
  const undockDisabled = config.allowUndock === false && window.isDocked;

  return (
    <div
      className={classNames(
        styles.contextWindowTitle,
        moving && styles.moving,
        undockDisabled && styles.undockDisabled,
      )}
      onMouseDown={window.onTitleMouseDown}
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
          onClick={() => window.onDock(defaultDockEdge)}
        >
          <DockIcon
            size={14}
            edge={defaultDockEdge}
          />
        </ContextWindowTitleButton>
      )}
      {canUndock && (
        <ContextWindowTitleButton
          className={styles.undockButton}
          label="Undock"
          title={`Undock ${windowLabel}`}
          onClick={window.onUndock}
        >
          <UndockIcon size={14} />
        </ContextWindowTitleButton>
      )}
      {titleBarButtons !== undefined && titleBarButtons !== null && (
        <div
          className={styles.contextWindowTitleButtons}
          onMouseDown={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          {titleBarButtons}
        </div>
      )}
      {canClose && (
        <ContextWindowTitleButton
          className={styles.contextWindowTitleClose}
          label="Close"
          title={`Close ${windowLabel}`}
          onClick={window.onClose}
        >
          <CloseIcon />
        </ContextWindowTitleButton>
      )}
    </div>
  );
};
