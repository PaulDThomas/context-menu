import { useState } from "react";
import { ContextMenu } from "./ContextMenu";
import styles from "./LowMenu.module.css";
import { CaretRightIcon } from "./icons";
import { IMenuItem } from "./interface";

export interface LowSubMenuProps {
  entry: IMenuItem;
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
      <CaretRightIcon />
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
