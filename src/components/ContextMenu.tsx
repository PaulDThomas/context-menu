import { forwardRef } from "react";
import styles from "./ContextMenu.module.css";
import { ContextMenuEntry } from "./ContextMenuEntry";
import { MenuItem } from "./interface";

// Constants for menu size estimation when ref is not yet available
const ESTIMATED_MENU_ITEM_HEIGHT = 34;
const ESTIMATED_MENU_PADDING = 4;
const ESTIMATED_MENU_WIDTH = 200;

export interface ContextMenuProps {
  visible: boolean;
  entries: MenuItem[];
  xPos: number;
  yPos: number;
  toClose: () => void;
}

export const ContextMenu = forwardRef<HTMLDivElement, ContextMenuProps>(
  ({ visible, entries, xPos, yPos, toClose }, ref): React.ReactElement => {
    // Check that menu can fit inside the window
    let menuHeight = entries.length * ESTIMATED_MENU_ITEM_HEIGHT + ESTIMATED_MENU_PADDING;
    let menuWidth = ESTIMATED_MENU_WIDTH;
    if (ref && typeof ref !== "function" && ref.current instanceof HTMLDivElement) {
      menuHeight = ref.current.offsetHeight;
      menuWidth = ref.current.offsetWidth;
    }
    const adjustedYPos =
      yPos + menuHeight > window.innerHeight
        ? Math.max(window.innerHeight - menuHeight - ESTIMATED_MENU_PADDING, 0)
        : yPos;
    const adjustedXPos =
      xPos + menuWidth > window.innerWidth
        ? Math.max(window.innerWidth - menuWidth - ESTIMATED_MENU_PADDING, 0)
        : xPos;

    return (
      <div
        ref={ref}
        className={[styles.contextMenu, visible ? styles.visible : styles.hidden]
          .filter((c) => c !== "")
          .join(" ")}
        style={{
          top: `${adjustedYPos}px`,
          left: `${adjustedXPos}px`,
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
