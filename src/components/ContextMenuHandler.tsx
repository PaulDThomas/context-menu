import {
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

export interface ContextMenuHandlerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  menuItems: MenuItem[];
  showLowMenu?: boolean;
}

function isDivider(label: string | JSX.Element): boolean {
  return typeof label !== "string" && label.type === "hr";
}

export const ContextMenuHandler = ({
  children,
  menuItems,
  showLowMenu = false,
  ...rest
}: ContextMenuHandlerProps): JSX.Element => {
  // Check for higher content menu
  const higherContext = useContext(ContentMenuHandlerContext);
  const thisMenuItems = useMemo(
    () => [
      ...(higherContext !== null
        ? [
            ...higherContext.menuItems,
            ...[
              higherContext.menuItems.length > 0 &&
              !isDivider(higherContext.menuItems[higherContext.menuItems.length - 1].label) &&
              menuItems.length > 0 &&
              !isDivider(menuItems[0].label)
                ? {
                    label: (
                      <hr style={{ flexGrow: 1, cursor: "none", margin: "0", padding: "0" }} />
                    ),
                  }
                : null,
            ].filter((item) => item !== null),
          ]
        : []),
      ...menuItems,
    ],
    [higherContext, menuItems],
  );

  // Menu resources
  const divHandlderRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuXPos, setMenuXPos] = useState<number>(0);
  const [menuYPos, setMenuYPos] = useState<number>(0);
  const [menuVisible, setMenuVisible] = useState<boolean>(false);
  const [menuInDom, setMenuInDom] = useState<boolean>(false);
  const [mouseOverHandlerDiv, setMouseOverHandlerDiv] = useState<boolean>(false);
  const [mouseOverMenu, setMouseOverMenu] = useState<boolean>(false);

  // Get holder position
  const divHandlerPos = divHandlderRef ? divHandlderRef.current?.getBoundingClientRect() : null;

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

  const removeController = useRef<AbortController>(new AbortController());
  useEffect(() => {
    if (!mouseOverMenu && !menuVisible && !mouseOverHandlerDiv) {
      removeController.current.abort();
      removeController.current = new AbortController();
      setTimeout(() => {
        if (!removeController.current.signal.aborted) setMenuInDom(false);
      }, 300);
    }
  }, [mouseOverHandlerDiv, menuVisible, mouseOverMenu]);

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
        onContextMenu={async (e) => {
          if (!showLowMenu) {
            setMenuInDom(true);
            e.preventDefault();
            e.stopPropagation();
            setTimeout(() => {
              removeController.current.abort();
              setMenuVisible(true);
              setMenuXPos(e.pageX);
              setMenuYPos(e.pageY);
            }, 1);
          }
        }}
        onMouseEnter={async (e) => {
          if (showLowMenu) {
            setMenuInDom(true);
            setMouseOverHandlerDiv(false);
            setTimeout(() => {
              removeController.current.abort();
              setMouseOverHandlerDiv(true);
            }, 1);
          }
          rest.onMouseEnter && rest.onMouseEnter(e);
        }}
        onMouseLeave={async (e) => {
          if (showLowMenu) {
            removeController.current.abort();
            removeController.current = new AbortController();
            setMouseOverHandlerDiv(false);
          }
          rest.onMouseLeave && rest.onMouseLeave(e);
        }}
      >
        {children}
      </div>
      {menuInDom &&
        divHandlerPos &&
        createPortal(
          <div
            className={styles.anchor}
            onMouseEnter={() => {
              removeController.current.abort();
              setMouseOverMenu(true);
            }}
            onMouseLeave={() => {
              removeController.current.abort();
              removeController.current = new AbortController();
              setMouseOverMenu(false);
            }}
          >
            {showLowMenu ? (
              <LowMenu
                visible={mouseOverHandlerDiv}
                entries={menuItems}
                xPos={divHandlerPos.left}
                yPos={divHandlerPos.bottom}
                maxWidth={divHandlerPos.width}
              />
            ) : (
              <ContextMenu
                visible={menuVisible}
                ref={menuRef}
                entries={thisMenuItems}
                xPos={menuXPos}
                yPos={menuYPos}
                toClose={() => {
                  setMenuVisible(false);
                  setMouseOverMenu(false);
                }}
              />
            )}
          </div>,
          document.body,
        )}
    </ContentMenuHandlerContext.Provider>
  );
};

ContextMenuHandler.displayName = "ContextMenuHandler";
