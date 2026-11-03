import type { IMenuItem } from "../interface";

export interface ContextSubMenuProps {
  entries: IMenuItem[];
  toClose: () => void;
  lowMenu?: boolean;
  visible: boolean;
}

export const ContextSubMenu = ({
  entries,
  toClose,
  visible,
}: ContextSubMenuProps): React.ReactElement => (
  <div
    data-testid="mock-context-sub-menu"
    data-visible={String(visible)}
    data-entries={entries.map((e) => String(e.label)).join(",")}
  >
    <button onClick={toClose}>mock-sub-menu-close</button>
  </div>
);
