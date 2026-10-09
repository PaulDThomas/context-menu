import type { IMenuItem } from "../interface";

export interface LowSubMenuProps {
  entry: IMenuItem;
  lowMenu?: boolean;
}

export const LowSubMenu = ({ entry }: LowSubMenuProps): React.ReactElement => (
  <div
    data-testid="mock-low-sub-menu"
    data-entry-label={String(entry.label)}
    data-entries={(entry.group ?? []).map((e) => String(e.label)).join(",")}
  />
);
