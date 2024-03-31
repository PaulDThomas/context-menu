import { MenuItem } from "./interface";
import styles from "./LowMenu.module.css";
import { LowMenuButton } from "./LowMenuButton";

interface LowMenuProps {
  entries: MenuItem[];
  target: Range | null;
  visible: boolean;
  xPos: number;
  yPos: number;
}

export const LowMenu = ({ entries, target, visible, xPos, yPos }: LowMenuProps): JSX.Element => {
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
          target={target}
        />
      ))}
    </div>
  );
};

LowMenu.displayName = "LowMenu";
