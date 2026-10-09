import { forwardRef, ReactNode, useImperativeHandle, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { classNames, useContextWindow } from "../functions";
import styles from "./ContextWindow.module.css";
import { ContextWindowTitleBar } from "./ContextWindowTitleBar";
import type { DockEdge } from "./interface";

const dockedEdgeClassNames: Record<DockEdge, string> = {
  top: styles.dockedTop,
  bottom: styles.dockedBottom,
  left: styles.dockedLeft,
  right: styles.dockedRight,
};

/** Props for a floating window, optionally dockable inside a DockingProvider. Other HTML attributes reach the window element. */
export interface ContextWindowProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Allow a docked window to be undocked by its button, dragging, or imperative handle. Defaults to true. */
  allowUndock?: boolean;
  /** Content rendered inside the scrollable window body. */
  children: React.ReactNode;
  /** Edge targeted by the dock button while floating. Defaults to right. */
  defaultDockEdge?: DockEdge;
  /** Enable drag docking and title-bar dock/undock controls. Defaults to true. */
  dockable?: boolean;
  /** Stable, unique window ID used for the DOM element and optional provider registration. */
  id: string;
  /** Dock into this edge's DockPanel whenever the window becomes visible. Omit to open floating. */
  initialDockEdge?: DockEdge;
  /** Called when closing is requested. Supplying it shows the close button; update visible to hide the window. */
  onClose?: () => void;
  /** Called when the window opens, after its initial position is applied. */
  onOpen?: () => void;
  /** Inline styles for the floating window. Docked layout is controlled by its panel. */
  style?: React.CSSProperties;
  /** Title text used in the title bar, dock-panel tab, and control tooltips. */
  title: string;
  /** Custom controls rendered after dock/undock and before close. */
  titleBarButtons?: ReactNode;
  /** Optional title-bar content rendered instead of title text; title remains the label and tooltip. */
  titleElement?: ReactNode;
  /** Control whether the window is rendered. Hiding a docked window removes it from its panel. */
  visible: boolean;
}

export interface ContextWindowHandle {
  pushToTop: () => void;
  dock: (edge: DockEdge) => void;
  undock: () => void;
}

export const ContextWindow = forwardRef<ContextWindowHandle, ContextWindowProps>(
  (
    {
      allowUndock = true,
      children,
      defaultDockEdge = "right",
      dockable = true,
      id,
      initialDockEdge,
      onClose,
      onOpen,
      title,
      titleBarButtons,
      titleElement,
      visible,
      ...rest
    },
    ref,
  ): React.ReactElement => {
    const window = useContextWindow(id, { onClose, onOpen });
    const { isDocked, registerWindowConfig } = window;

    useLayoutEffect(() => {
      registerWindowConfig(id, {
        id,
        visible,
        title,
        titleBarButtons,
        titleElement,
        dockable,
        defaultDockEdge,
        initialDockEdge,
        allowUndock,
        canClose: onClose !== undefined,
        canDock: dockable && !isDocked,
        canUndock: dockable && isDocked && allowUndock,
      });
    }, [
      allowUndock,
      defaultDockEdge,
      dockable,
      id,
      initialDockEdge,
      onClose,
      title,
      titleBarButtons,
      titleElement,
      visible,
      isDocked,
      registerWindowConfig,
    ]);

    useImperativeHandle(
      ref,
      () => ({
        pushToTop: window.pushToTop,
        dock: window.dock,
        undock: window.undock,
      }),
      [window.dock, window.pushToTop, window.undock],
    );

    return (
      <div
        className={styles.contextWindowAnchor}
        ref={window.divRef}
      >
        {visible &&
          createPortal(
            <div
              {...rest}
              ref={window.setWindowNode}
              id={id}
              className={classNames(
                styles.contextWindow,
                window.isDocked && styles.docked,
                window.isDocked &&
                  window.dockedWindow &&
                  dockedEdgeClassNames[window.dockedWindow.edge],
                rest.className,
              )}
              style={{
                ...(window.isDocked ? {} : rest.style),
                opacity: window.moving ? 0.8 : window.windowVisible ? 1 : 0,
                visibility: window.windowVisible ? "visible" : "hidden",
                display: window.isDocked
                  ? window.isActiveDockedWindow
                    ? "flex"
                    : "none"
                  : rest.style?.display,
                zIndex: window.zIndex,
                minHeight: window.isDocked ? "auto" : (rest.style?.minHeight ?? "150px"),
                minWidth: window.isDocked ? "auto" : (rest.style?.minWidth ?? "200px"),
                maxHeight: window.isDocked ? "100%" : (rest.style?.maxHeight ?? "1000px"),
                maxWidth: window.isDocked ? "100%" : (rest.style?.maxWidth ?? "1000px"),
                width: window.isDocked ? "100%" : rest.style?.width,
                height: window.isDocked ? "100%" : rest.style?.height,
              }}
              onClickCapture={(event) => {
                window.handleWindowClick(event);
                rest.onClickCapture?.(event);
              }}
            >
              <ContextWindowTitleBar window={window} />
              <div className={styles.contextWindowBody}>
                <div>{children}</div>
              </div>
            </div>,
            window.portalTarget,
          )}
      </div>
    );
  },
);

ContextWindow.displayName = "ContextWindow";
