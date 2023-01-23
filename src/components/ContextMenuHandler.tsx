import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ContextMenu } from './ContextMenu';
import { iMenuItem } from './interface';
import { MenuContext } from './MenuContext';

export const ContextMenuHandler = ({
  children,
}: {
  children: JSX.Element[] | JSX.Element;
}): JSX.Element => {
  // Menu resources
  const divRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuXPos, setMenuXPos] = useState<number>(0);
  const [menuYPos, setMenuYPos] = useState<number>(0);
  const [menuVisible, setMenuVisible] = useState<boolean>(false);
  const [menuItems, setMenuItems] = useState<iMenuItem[]>([]);

  // Update menu items
  const updateMenu = useCallback(
    (ret: { visible?: boolean; x?: number; y?: number; menuItems?: iMenuItem[] }) => {
      if (divRef.current) {
        if (ret.visible !== undefined) setMenuVisible(ret.visible);
        if (ret.x) setMenuXPos(ret.x - window.scrollX - divRef.current.getBoundingClientRect().x);
        if (ret.y) setMenuYPos(ret.y - window.scrollX - divRef.current.getBoundingClientRect().y);
        if (ret.menuItems !== undefined) setMenuItems(ret.menuItems);
      }
    },
    [],
  );

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
    if (menuVisible) document.addEventListener('mousedown', handleClick);
    else document.removeEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
    };
  }, [handleClick, menuVisible]);

  return (
    <MenuContext.Provider
      value={{
        visible: menuVisible,
        x: menuXPos,
        y: menuYPos,
        set: updateMenu,
      }}
    >
      <div
        className='menu-context-provider'
        style={{ position: 'relative' }}
        ref={divRef}
      >
        {children}
        <ContextMenu
          ref={menuRef}
          entries={menuItems}
          visible={menuVisible}
          xPos={menuXPos}
          yPos={menuYPos}
        />
      </div>
    </MenuContext.Provider>
  );
};
