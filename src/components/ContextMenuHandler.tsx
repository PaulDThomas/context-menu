import { MouseEvent, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ContextMenu } from './ContextMenu';
import { iMenuItem } from './interface';
import './ContextMenu.scss';

export const ContextMenuHandler = ({
  children,
  menuItems,
}: {
  children: JSX.Element[] | JSX.Element;
  menuItems: iMenuItem[];
}): JSX.Element => {
  // Menu resources
  const divRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuXPos, setMenuXPos] = useState<number>(0);
  const [menuYPos, setMenuYPos] = useState<number>(0);
  const [menuVisible, setMenuVisible] = useState<boolean>(false);

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
    if (menuVisible) document.addEventListener('mousedown', handleClick);
    else document.removeEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
    };
  }, [handleClick, menuVisible]);

  return (
    <>
      <div
        onContextMenu={showMenu}
        className='context-menu-handler'
      >
        {children}
      </div>
      {menuVisible &&
        createPortal(
          <div
            style={{ position: 'absolute', top: 0, left: 0 }}
            ref={divRef}
          >
            <ContextMenu
              visible={true}
              ref={menuRef}
              entries={menuItems}
              xPos={menuXPos}
              yPos={menuYPos}
              toClose={() => setMenuVisible(false)}
            />
          </div>,
          document.body,
        )}
    </>
  );
};
