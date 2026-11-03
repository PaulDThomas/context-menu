import { ContextMenu } from "./ContextMenu";
import styles from "./ContextMenu.module.css";
import { CaretRightIcon } from "./icons";
import { IMenuItem } from "./interface";

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
}: ContextSubMenuProps): React.ReactElement => {
  return (
    <span className={styles.caretHolder}>
      <CaretRightIcon />
      {visible && (
        <div className={styles.subMenu}>
          <ContextMenu
            visible={true}
            entries={entries}
            xPos={14}
            yPos={-21}
            toClose={toClose}
          />
        </div>
      )}
    </span>
  );
};

ContextSubMenu.displayName = "ContextSubMenu";
