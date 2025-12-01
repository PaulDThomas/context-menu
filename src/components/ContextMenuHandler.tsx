import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { ContextMenu } from "./ContextMenu";
import styles from "./ContextMenu.module.css";
import { LowMenu } from "./LowMenu";
import { IMenuItem } from "./interface";

export interface ContentMenuHandlerContextProps {
  menuItems: IMenuItem[];
}
export const ContentMenuHandlerContext = createContext<ContentMenuHandlerContextProps | null>(null);

export interface ContextMenuHandlerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  menuItems: IMenuItem[];
  showLowMenu?: boolean;
}

function isDivider(label: string | React.ReactElement): boolean {
  return typeof label !== "string" && label.type === "hr";
}

export const ContextMenuHandler = ({
  children,
  menuItems,
  showLowMenu = false,
  ...rest
}: ContextMenuHandlerProps): React.ReactElement => {
  // Check for higher content menu
  const higherContext = useContext(ContentMenuHandlerContext);
  const thisMenuItems: IMenuItem[] = [
    ...(higherContext !== null
      ? [
          ...higherContext.menuItems,
          ...[
            higherContext.menuItems.length > 0 &&
            !isDivider(higherContext.menuItems[higherContext.menuItems.length - 1].label) &&
            menuItems.length > 0 &&
            !isDivider(menuItems[0].label)
              ? {
                  label: <hr style={{ flexGrow: 1, cursor: "none", margin: "0", padding: "0" }} />,
                }
              : null,
          ].filter((item) => item !== null),
        ]
      : []),
    ...menuItems,
  ];

  // Menu resources
  const divHandlderRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuXPos, setMenuXPos] = useState<number>(0);
  const [menuYPos, setMenuYPos] = useState<number>(0);
  const [menuVisible, setMenuVisible] = useState<boolean>(false);
  const [menuInDom, setMenuInDom] = useState<boolean>(false);
  const [mouseOverHandlerDiv, setMouseOverHandlerDiv] = useState<boolean>(false);
  const [mouseOverMenu, setMouseOverMenu] = useState<boolean>(false);

  // Holder position - measured in an effect to avoid reading refs during render
  const [divHandlerPos, setDivHandlerPos] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    function updatePos() {
      if (divHandlderRef.current) {
        setDivHandlerPos(divHandlderRef.current.getBoundingClientRect());
      }
    }

    // When the handler is hovered or the menu is mounted, ensure we have a fresh position
    if (mouseOverHandlerDiv || menuInDom) {
      updatePos();
    }

    // Attach listeners while the menu/low-menu may be visible so the position stays correct
    if (mouseOverHandlerDiv || menuInDom) {
      window.addEventListener("resize", updatePos);
      // listen on capture to catch scrolls from ancestor elements as well
      window.addEventListener("scroll", updatePos, true);

      let ro: ResizeObserver | null = null;
      if (typeof ResizeObserver !== "undefined" && divHandlderRef.current) {
        ro = new ResizeObserver(() => updatePos());
        ro.observe(divHandlderRef.current);
      }

      return () => {
        window.removeEventListener("resize", updatePos);
        window.removeEventListener("scroll", updatePos, true);
        if (ro) ro.disconnect();
      };
    }
  }, [mouseOverHandlerDiv, menuInDom]);

  // Handle click off the menu
  const handleClick = useCallback((e: MouseEvent) => {
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
          rest.onMouseEnter?.(e);
        }}
        onMouseLeave={async (e) => {
          if (showLowMenu) {
            removeController.current.abort();
            removeController.current = new AbortController();
            setMouseOverHandlerDiv(false);
          }
          rest.onMouseLeave?.(e);
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
