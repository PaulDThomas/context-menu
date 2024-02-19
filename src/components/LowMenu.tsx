import { iMenuItem } from "./interface";
import "./LowMenu.css";
import { LowMenuButton } from "./LowMenuButton";

interface LowMenuProps {
  entries: iMenuItem[];
  target: Range | null;
  visible: boolean;
}

export const LowMenu = ({ entries, target, visible }: LowMenuProps): JSX.Element => {
  return (
    <div
      className={`low-menu ${visible ? "visible" : "hidden"}`}
      aria-label="Low context menu"
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
