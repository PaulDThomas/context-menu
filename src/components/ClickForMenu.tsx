import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ContextMenu } from "./ContextMenu";
import styles from "./ContextMenu.module.css";
import { IMenuItem } from "./interface";

interface ClickForMenuProps extends React.HTMLAttributes<HTMLDivElement> {
  id: string;
  menuItems?: IMenuItem[];
  children?: React.ReactNode;
}

export const ClickForMenu = ({
  id,
  menuItems,
  children,
  ...rest
}: ClickForMenuProps): React.ReactElement => {
  // Menu state
  const [menuInDom, setMenuInDom] = useState<boolean>(false);
  const [menuVisible, setMenuVisible] = useState<boolean>(false);
  const [menuXPos, setMenuXPos] = useState<number>(0);
  const [menuYPos, setMenuYPos] = useState<number>(0);

  // Set up outsideClick handler
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Handle click off the menu
  const handleClick = useCallback((e: MouseEvent) => {
    if (
      menuRef.current &&
      ((e.target instanceof Element && !menuRef.current.contains(e.target)) ||
        !(e.target instanceof Element))
    ) {
      setMenuInDom(false);
    }
  }, []);

  const removeController = useRef<AbortController | null>(null);
  const removeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!menuVisible && removeTimeoutRef.current === null) {
      // Only create a new controller when scheduling a new timeout
      if (removeController.current) {
        removeController.current.abort();
      }
      removeController.current = new AbortController();
      const controller = removeController.current;
      // Set up the timeout with a reference to the current controller
      removeTimeoutRef.current = setTimeout(() => {
        if (!controller.signal.aborted) setMenuInDom(false);
        removeTimeoutRef.current = null;
      }, 300);
    }
    return () => {
      // Clean up on unmount or when menuVisible changes
      if (removeTimeoutRef.current) {
        clearTimeout(removeTimeoutRef.current);
        removeTimeoutRef.current = null;
      }
    };
  }, [menuVisible]);

  // Update the document click handler
  useEffect(() => {
    if (menuInDom) document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      if (removeController.current) {
        removeController.current.abort();
      }
    };
  }, [handleClick, menuInDom]);

  return (
    <>
      <div
        {...rest}
        id={id}
        onClick={(e) => {
          if (menuItems) {
            setMenuInDom(true);
            e.preventDefault();
            e.stopPropagation();
            setTimeout(() => {
              if (removeController.current) {
                removeController.current.abort();
              }
              setMenuVisible(true);
              setMenuXPos(e.pageX);
              setMenuYPos(e.pageY);
            }, 1);
          } else {
            rest.onClick?.(e);
          }
        }}
      >
        {children}
      </div>
      {menuInDom &&
        menuItems &&
        createPortal(
          <div className={styles.anchor}>
            <ContextMenu
              visible={menuVisible}
              ref={menuRef}
              entries={menuItems}
              xPos={menuXPos}
              yPos={menuYPos}
              toClose={() => {
                setMenuVisible(false);
              }}
            />
          </div>,
          document.body,
        )}
    </>
  );
};

ClickForMenu.displayName = "ClickForMenu";
