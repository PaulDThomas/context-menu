import styles from "./LowMenu.module.css";
import { LowSubMenu } from "./LowSubMenu";
import { MenuItem } from "./interface";
import { useState } from "react";

interface LowMenuButtonProps {
  entry: MenuItem;
}
export const LowMenuButton = ({ entry }: LowMenuButtonProps) => {
  const [target, setTarget] = useState<Range | null>(null);
  return (
    <div
      className={[styles.lowMenuItem, entry.disabled ? styles.disabled : ""]
        .filter((c) => c !== "")
        .join(" ")}
      aria-label={typeof entry.label === "string" ? entry.label : undefined}
      aria-disabled={entry.disabled}
      onMouseEnter={() => {
        const sel = window.getSelection();
        const target = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
        setTarget(target);
      }}
      onMouseLeave={() => {
        setTarget(null);
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        entry.action && !entry.disabled && entry.action(target);
      }}
    >
      <span>{entry.label}</span>
      {entry.group && <LowSubMenu entry={entry} />}
    </div>
  );
};

LowMenuButton.displayName = "LowMenuButton";
