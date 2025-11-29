import React, { forwardRef, useLayoutEffect, useState } from "react";
import styles from "./ContextMenu.module.css";
import { ContextMenuEntry } from "./ContextMenuEntry";
import { IMenuItem } from "./interface";

// Constants for menu size estimation when ref is not yet available
const ESTIMATED_MENU_ITEM_HEIGHT = 34;
const ESTIMATED_MENU_PADDING = 4;
const ESTIMATED_MENU_WIDTH = 200;

export interface ContextMenuProps {
  visible: boolean;
  entries: IMenuItem[];
  xPos: number;
  yPos: number;
  toClose: () => void;
}

export const ContextMenu = forwardRef<HTMLDivElement, ContextMenuProps>(
  ({ visible, entries, xPos, yPos, toClose }, ref): React.ReactElement => {
    // Measure menu size after mount/render to avoid accessing refs during render
    const [menuHeight, setMenuHeight] = useState(
      entries.length * ESTIMATED_MENU_ITEM_HEIGHT + ESTIMATED_MENU_PADDING,
    );
    const [menuWidth, setMenuWidth] = useState(ESTIMATED_MENU_WIDTH);

    useLayoutEffect(() => {
      // Only measure when visible; ref access inside effect is allowed
      if (visible && ref && typeof ref !== "function" && ref.current instanceof HTMLDivElement) {
        setMenuHeight(ref.current.offsetHeight);
        setMenuWidth(ref.current.offsetWidth);
      }
      // When not visible, fall back to estimates
      if (!visible) {
        setMenuHeight(entries.length * ESTIMATED_MENU_ITEM_HEIGHT + ESTIMATED_MENU_PADDING);
        setMenuWidth(ESTIMATED_MENU_WIDTH);
      }
    }, [visible, entries, ref]);

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
