import React, { useState } from "react";
import styles from "./ContextMenu.module.css";
import { ContextSubMenu } from "./ContextSubMenu";
import { MenuItem } from "./interface";

export interface ContextMenuProps {
  visible: boolean;
  entries: MenuItem[];
  xPos: number;
  yPos: number;
  toClose: () => void;
}

export const ContextMenu = React.forwardRef<HTMLDivElement, ContextMenuProps>(
  ({ visible, entries, xPos, yPos, toClose }, ref): JSX.Element => {
    const [target, setTarget] = useState<Range | null>(null);

    return (
      <div
        ref={ref}
        className={[styles.contextMenu, visible ? styles.visible : styles.hidden]
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
                onMouseEnter={() => {
                  const sel = window.getSelection();
                  const target = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
                  setTarget(target);
                }}
                onMouseLeave={() => {
                  setTarget(null);
                }}
                onMouseDownCapture={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
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
              />
            )}
          </div>
        ))}
      </div>
    );
  },
);

ContextMenu.displayName = "ContextMenu";
