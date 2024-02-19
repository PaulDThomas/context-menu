import { LowSubMenu } from "./LowSubMenu";
import { MenuItem } from "./interface";

interface LowMenuButtonProps {
  entry: MenuItem;
  target: Range | null;
}
export const LowMenuButton = ({ entry, target }: LowMenuButtonProps) => {
  return (
    <div
      className={`low-menu-item${entry.disabled ? " disabled" : ""}`}
      aria-label={typeof entry.label === "string" ? entry.label : undefined}
      aria-disabled={entry.disabled}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        entry.action && !entry.disabled && entry.action(target);
      }}
    >
      <span className="low-menu-item-label">{entry.label}</span>
      {entry.group && (
        <LowSubMenu
          entry={entry}
          target={target}
        />
      )}
    </div>
  );
};

LowMenuButton.displayName = "LowMenuButton";
