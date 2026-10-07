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

export interface ContextWindowProps extends React.HTMLAttributes<HTMLDivElement> {
  allowUndock?: boolean;
  children: React.ReactNode;
  /** Edge used by the dock button while the window is floating (defaults to right) */
  defaultDockEdge?: DockEdge;
  /** When false, a docked window stays docked: no undock button, drag-undock or `undock()` */
  dockable?: boolean;
  id: string;
  /** Dock into this edge's DockPanel whenever the window opens (requires `dockable`) */
  initialDockEdge?: DockEdge;
  onClose?: () => void;
  onOpen?: () => void;
  style?: React.CSSProperties;
  title: string;
  titleElement?: ReactNode;
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
              <ContextWindowTitleBar id={id} />
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
