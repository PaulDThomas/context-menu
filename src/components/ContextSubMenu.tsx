import { ContextMenu } from "./ContextMenu";
import styles from "./ContextMenu.module.css";
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
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        fill="currentColor"
        viewBox="0 0 16 16"
      >
        <path d="m12.14 8.753-5.482 4.796c-.646.566-1.658.106-1.658-.753V3.204a1 1 0 0 1 1.659-.753l5.48 4.796a1 1 0 0 1 0 1.506z" />
      </svg>
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
