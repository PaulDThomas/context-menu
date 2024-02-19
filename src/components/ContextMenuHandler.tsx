import { MouseEvent, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ContextMenu } from "./ContextMenu";
import "./ContextMenu.css";
import { LowMenu } from "./LowMenu";
import { MenuItem } from "./interface";

interface contextMenuHandlerProps {
  children: JSX.Element[] | JSX.Element;
  menuItems: MenuItem[];
  showLowMenu?: boolean;
  lowMenuTarget?: Range | null;
  style?: React.CSSProperties;
}

export const ContextMenuHandler = ({
  children,
  menuItems,
  showLowMenu = false,
  style = {
    height: "fit-content",
    width: "fit-content",
  },
}: contextMenuHandlerProps): JSX.Element => {
  // Menu resources
  const divRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuXPos, setMenuXPos] = useState<number>(0);
  const [menuYPos, setMenuYPos] = useState<number>(0);
  const [menuVisible, setMenuVisible] = useState<boolean>(false);
  const [target, setTarget] = useState<Range | null>(null);
  const [lowTarget, setLowTarget] = useState<Range | null>(null);
  const [lowMenuVisible, setLowMenuVisible] = useState<boolean>(false);

  // Show menu when context is requested
  const showMenu = (e: MouseEvent<HTMLDivElement>) => {
    const sel = window.getSelection();
    setTarget(sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null);
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
    <>
      <div
        onContextMenu={showLowMenu ? undefined : showMenu}
        className="context-menu-handler"
        style={style}
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
            style={{ position: "absolute", top: 0, left: 0 }}
            ref={divRef}
          >
            <ContextMenu
              visible={true}
              ref={menuRef}
              entries={menuItems}
              xPos={menuXPos}
              yPos={menuYPos}
              target={target}
              toClose={() => setMenuVisible(false)}
            />
          </div>,
          document.body,
        )}
      {showLowMenu && (
        <div
          style={{ position: "relative" }}
          onMouseEnter={() => {
            const sel = window.getSelection();
            const lowSel = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
            setLowTarget(lowSel);
          }}
          onMouseLeave={() => {
            setLowTarget(null);
          }}
        >
          <LowMenu
            visible={lowMenuVisible}
            entries={menuItems}
            target={lowTarget}
          />
        </div>
      )}
    </>
  );
};

ContextMenuHandler.displayName = "ContextMenuHandler";
