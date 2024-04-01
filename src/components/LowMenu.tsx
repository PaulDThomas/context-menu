import { MenuItem } from "./interface";
import styles from "./LowMenu.module.css";
import { LowMenuButton } from "./LowMenuButton";

interface LowMenuProps {
  entries: MenuItem[];
  visible: boolean;
  xPos: number;
  yPos: number;
}

export const LowMenu = ({ entries, visible, xPos, yPos }: LowMenuProps): JSX.Element => {
  return (
    <div
      className={[styles.lowMenu, visible ? styles.visible : styles.hidden].join(" ")}
      aria-label="Low context menu"
      style={{
        left: `${xPos}px`,
        top: `${yPos}px`,
      }}
    >
      {entries.map((e, i) => (
        <LowMenuButton
          key={i}
          entry={e}
        />
      ))}
    </div>
  );
};

LowMenu.displayName = "LowMenu";
