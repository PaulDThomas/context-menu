import { forwardRef } from "react";
import type { IMenuItem } from "../interface";

export interface ContextMenuProps {
  visible: boolean;
  entries: IMenuItem[];
  xPos: number;
  yPos: number;
  toClose: () => void;
}

export const ContextMenu = forwardRef<HTMLDivElement, ContextMenuProps>(
  ({ visible, entries, xPos, yPos, toClose }, ref): React.ReactElement => (
    <div
      ref={ref}
      data-testid="mock-context-menu"
      data-visible={String(visible)}
      data-entries={entries.map((e) => String(e.label)).join(",")}
      data-x-pos={xPos}
      data-y-pos={yPos}
    >
      <button onClick={toClose}>mock-context-menu-close</button>
    </div>
  ),
);

ContextMenu.displayName = "ContextMenu";
