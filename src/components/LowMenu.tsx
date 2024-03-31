import { MenuItem } from "./interface";
import "./LowMenu.css";
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
      className={`low-menu ${visible ? "visible" : "hidden"}`}
      aria-label="Low context menu"
      style={{
        transform: `translate(${xPos}px, ${yPos}px)`,
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
