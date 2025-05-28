import { forwardRef } from "react";
import styles from "./ContextMenu.module.css";
import { ContextMenuEntry } from "./ContextMenuEntry";
import { MenuItem } from "./interface";

export interface ContextMenuProps {
  visible: boolean;
  entries: MenuItem[];
  xPos: number;
  yPos: number;
  toClose: () => void;
}

export const ContextMenu = forwardRef<HTMLDivElement, ContextMenuProps>(
  ({ visible, entries, xPos, yPos, toClose }, ref): JSX.Element => {
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
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {entries.map((entry, i) => (
          <ContextMenuEntry
            key={i}
            entry={entry}
            toClose={toClose}
          />
        ))}
      </div>
    );
  },
);

ContextMenu.displayName = "ContextMenu";
