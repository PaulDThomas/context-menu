import styles from "./LowMenu.module.css";
import { LowMenuButton } from "./LowMenuButton";
import { MenuItem } from "./interface";

interface LowMenuProps {
  entries: MenuItem[];
  visible: boolean;
  xPos: number;
  yPos: number;
  maxWidth: number;
}

export const LowMenu = ({ entries, visible, xPos, yPos, maxWidth }: LowMenuProps): JSX.Element => {
  return (
    <div
      className={[styles.lowMenu, visible ? styles.visible : styles.hidden].join(" ")}
      aria-label="Low context menu"
      style={{
        left: `${xPos}px`,
        top: `${yPos}px`,
        maxWidth: `calc(${maxWidth}px)`,
        width: `calc(${maxWidth}px - 4px)`,
      }}
    >
      <div className={styles.lowMenuButtonHolder}>
        {entries.map((e, i) => (
          <LowMenuButton
            key={i}
            entry={e}
          />
        ))}
      </div>
    </div>
  );
};

LowMenu.displayName = "LowMenu";
