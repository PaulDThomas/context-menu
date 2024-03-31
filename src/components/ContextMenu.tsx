import React from "react";
import styles from "./ContextMenu.module.css";
import { ContextSubMenu } from "./ContextSubMenu";
import { MenuItem } from "./interface";

export interface contextMenuProps {
  visible: boolean;
  entries: MenuItem[];
  target: Range | null;
  xPos: number;
  yPos: number;
  toClose: () => void;
}

export const ContextMenu = React.forwardRef<HTMLDivElement, contextMenuProps>(
  ({ visible, entries, target, xPos, yPos, toClose }, ref): JSX.Element => {
    ContextMenu.displayName = "ContextMenu";

    return (
      <div
        ref={ref}
        className={[styles.contextMenu, visible ? styles.visible : ""]
          .filter((c) => c !== "")
          .join(" ")}
        style={{
          top: `${yPos}px`,
          left: `${xPos}px`,
        }}
        onContextMenuCapture={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {entries.map((entry, i) => (
          <div
            key={i}
            className={[styles.contextMenuItem, entry.disabled ? styles.disabled : ""]
              .filter((c) => c !== "")
              .join(" ")}
          >
            {typeof entry.label === "string" ? (
              <span
                aria-label={typeof entry.label === "string" ? entry.label : undefined}
                aria-disabled={entry.disabled}
                className={styles.contextMenuItemLabel}
                onMouseDownCapture={(ev) => {
                  ev.preventDefault();
                  ev.stopPropagation();
                  entry.action && !entry.disabled && entry.action(target);
                  !entry.disabled && toClose();
                }}
              >
                {entry.label}
              </span>
            ) : (
              entry.label
            )}
            {entry.group && (
              <ContextSubMenu
                toClose={toClose}
                entries={entry.group}
                target={target}
              />
            )}
          </div>
        ))}
      </div>
    );
  },
);

ContextMenu.displayName = "ContextMenu";
