import {
  MouseEvent,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { ContextMenu } from "./ContextMenu";
import styles from "./ContextMenu.module.css";
import { LowMenu } from "./LowMenu";
import { MenuItem } from "./interface";

export interface ContentMenuHandlerContextProps {
  menuItems: MenuItem[];
}
export const ContentMenuHandlerContext = createContext<ContentMenuHandlerContextProps | null>(null);

interface contextMenuHandlerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: JSX.Element[] | JSX.Element;
  menuItems: MenuItem[];
  showLowMenu?: boolean;
}

export const ContextMenuHandler = ({
  children,
  menuItems,
  showLowMenu = false,
  ...rest
}: contextMenuHandlerProps): JSX.Element => {
  // Check for higher content menu
  const higherContext = useContext(ContentMenuHandlerContext);
  const thisMenuItems = useMemo(
    () => [
      ...(higherContext !== null
        ? [
            ...higherContext.menuItems,
            {
              label: <hr style={{ flexGrow: 1, cursor: "none", margin: "0", padding: "0" }} />,
            },
          ]
        : []),
      ...menuItems,
    ],
    [higherContext, menuItems],
  );

  // Menu resources
  const divHandlderRef = useRef<HTMLDivElement | null>(null);
  const divMenuRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuXPos, setMenuXPos] = useState<number>(0);
  const [menuYPos, setMenuYPos] = useState<number>(0);
  const [menuVisible, setMenuVisible] = useState<boolean>(false);
  const [lowMenuVisible, setLowMenuVisible] = useState<boolean>(false);

  // Get holder position
  const divHandlerPos = divHandlderRef ? divHandlderRef.current?.getBoundingClientRect() : null;

  // Show menu when context is requested
  const showMenu = (e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuVisible(true);
    setMenuXPos(e.pageX);
    setMenuYPos(e.pageY);
  };

  // Handle click off the menu
  const handleClick = useCallback((e: globalThis.MouseEvent) => {
    if (
      menuRef.current &&
      ((e.target instanceof Element && !menuRef.current?.contains(e.target)) ||
        !(e.target instanceof Element))
    ) {
      setMenuVisible(false);
    }
  }, []);

  // Update the document click handler
  useEffect(() => {
    if (menuVisible) document.addEventListener("mousedown", handleClick);
    else document.removeEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, [handleClick, menuVisible]);

  return (
    <ContentMenuHandlerContext.Provider
      value={{
        menuItems: thisMenuItems,
      }}
    >
      <div
        ref={divHandlderRef}
        {...rest}
        className={[styles.contextMenuHandler, rest.className].join(" ")}
        style={{ ...rest.style }}
        onContextMenu={showLowMenu ? undefined : showMenu}
        onMouseEnter={() => {
          showLowMenu && setLowMenuVisible(true);
        }}
        onMouseLeave={() => {
          showLowMenu && setLowMenuVisible(false);
        }}
      >
        {children}
      </div>
      {menuVisible &&
        !showLowMenu &&
        createPortal(
          <div
            className={styles.anchor}
            ref={divMenuRef}
          >
            <ContextMenu
              visible={true}
              ref={menuRef}
              entries={thisMenuItems}
              xPos={menuXPos}
              yPos={menuYPos}
              toClose={() => setMenuVisible(false)}
            />
          </div>,
          document.body,
        )}
      {showLowMenu &&
        divHandlerPos &&
        createPortal(
          <div className={styles.anchor}>
            <LowMenu
              visible={lowMenuVisible}
              entries={menuItems}
              xPos={divHandlerPos.left}
              yPos={divHandlerPos.bottom}
            />
          </div>,
          document.body,
        )}
    </ContentMenuHandlerContext.Provider>
  );
};

ContextMenuHandler.displayName = "ContextMenuHandler";
