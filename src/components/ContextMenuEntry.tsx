import { useState } from "react";
import styles from "./ContextMenu.module.css";
import { ContextSubMenu } from "./ContextSubMenu";
import { MenuItem } from "./interface";

interface ContextMenuEntryProps {
  entry: MenuItem;
  toClose: () => void;
}

export const ContextMenuEntry = ({ entry, toClose }: ContextMenuEntryProps) => {
  const [target, setTarget] = useState<Range | null>(null);
  const [subMenuVisible, setSubMenuVisible] = useState<boolean>(false);
  return (
    <div
      className={[styles.contextMenuItem, entry.disabled ? styles.disabled : ""]
        .filter((c) => c !== "")
        .join(" ")}
      onMouseEnter={() => {
        setSubMenuVisible(true);
      }}
      onMouseLeave={() => {
        setSubMenuVisible(false);
      }}
    >
      {typeof entry.label === "string" ? (
        <span
          aria-label={entry.label}
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
            if (!entry.disabled) {
              if (entry.action) {
                entry.action(target, e);
              }
              toClose();
            }
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
          visible={subMenuVisible}
        />
      )}
    </div>
  );
};
