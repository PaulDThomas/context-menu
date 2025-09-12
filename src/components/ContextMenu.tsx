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
    // Check that menu can fit inside the window
    let menuHeight = entries.length * 34 + 4;
    let menuWidth = 200;
    if (ref && typeof ref !== "function" && ref.current instanceof HTMLDivElement) {
      menuHeight = ref.current.offsetHeight;
      menuWidth = ref.current.offsetWidth;
      console.log("Ref set", menuHeight, menuWidth);
    }
    if (yPos + menuHeight > window.innerHeight)
      yPos = Math.max(window.innerHeight - menuHeight - 4, 0);
    if (xPos + menuWidth > window.innerWidth) xPos = Math.max(window.innerWidth - menuWidth - 4, 0);

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
