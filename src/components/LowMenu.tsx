import { iMenuItem } from "./interface";
import "./LowMenu.css";
import { LowMenuButton } from "./LowMenuButton";

interface LowMenuProps {
  entries: iMenuItem[];
  target: Range | null;
}

export const LowMenu = ({ entries, target }: LowMenuProps): JSX.Element => {
  return (
    <div
      className="low-menu"
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
