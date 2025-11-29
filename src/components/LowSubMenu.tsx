import { useState } from "react";
import { ContextMenu } from "./ContextMenu";
import styles from "./LowMenu.module.css";
import { MenuItem } from "./interface";

export interface LowSubMenuProps {
  entry: MenuItem;
  lowMenu?: boolean;
}

export const LowSubMenu = ({ entry }: LowSubMenuProps): React.ReactElement => {
  const [visible, setVisible] = useState<boolean>(false);
  if (!entry.group || entry.group.length === 0) return <></>;
  return (
    <span
      aria-label={`Sub menu for ${entry.label}`}
      className={styles.caretHolder}
      onMouseEnter={() => {
        setVisible(true);
      }}
      onMouseLeave={() => {
        setVisible(false);
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        fill="currentColor"
        viewBox="0 0 16 16"
      >
        <path d="m12.14 8.753-5.482 4.796c-.646.566-1.658.106-1.658-.753V3.204a1 1 0 0 1 1.659-.753l5.48 4.796a1 1 0 0 1 0 1.506z" />
      </svg>
      <div className={styles.subMenu}>
        {visible && (
          <ContextMenu
            visible={visible}
            entries={entry.group}
            xPos={14}
            yPos={entry.group.length * -21 - 8}
            toClose={() => setVisible(false)}
          />
        )}
      </div>
    </span>
  );
};

LowSubMenu.displayName = "LowSubMenu";
