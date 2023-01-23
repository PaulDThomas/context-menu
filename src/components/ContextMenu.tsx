import React, { useContext } from 'react';
import './ContextMenu.css';
import { iMenuItem } from './interface';
import { MenuContext } from './MenuContext';

export interface contextMenuProps {
  entries: iMenuItem[];
  visible: boolean;
  xPos: number;
  yPos: number;
}

export const ContextMenu = React.forwardRef<HTMLDivElement, contextMenuProps>(
  ({ entries, visible, xPos, yPos }, ref): JSX.Element => {
    ContextMenu.displayName = 'ContextMenu';
    const menuContext = useContext(MenuContext);

    return (
      <div
        ref={ref}
        className={`context-menu ${visible ? 'visible' : ''}`}
        style={{
          top: `${yPos}px`,
          left: `${xPos}px`,
        }}
      >
        {entries.map((e, i) => (
          <div
            key={i}
            className='context-menu-item'
            onClick={() => {
              e.action && e.action();
              menuContext.set && menuContext.set({ visible: false });
            }}
          >
            {e.label}
          </div>
        ))}
      </div>
    );
  },
);
