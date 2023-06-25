import { MouseEvent, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ContextMenu } from './ContextMenu';
import { iMenuItem } from './interface';
import './ContextMenu.css';

export const ContextMenuHandler = ({
  children,
  menuItems,
  style = {
    height: 'fit-content',
    width: 'fit-content',
  },
}: {
  children: JSX.Element[] | JSX.Element;
  menuItems: iMenuItem[];
  style?: React.CSSProperties;
}): JSX.Element => {
  // Menu resources
  const divRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuXPos, setMenuXPos] = useState<number>(0);
  const [menuYPos, setMenuYPos] = useState<number>(0);
  const [menuVisible, setMenuVisible] = useState<boolean>(false);
  const [target, setTarget] = useState<Range | null>(null);

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
        style={style}
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
              target={target}
              toClose={() => setMenuVisible(false)}
            />
          </div>,
          document.body,
        )}
    </>
  );
};

ContextMenuHandler.displayName = 'ContextMenuHandler';
