import React, { useContext } from 'react';
import { iMenuItem } from './interface';

export interface contextMenuProps {
  entries: iMenuItem[];
  xPos: number;
  yPos: number;
  toClose: () => void;
}

export const ContextMenu = React.forwardRef<HTMLDivElement, contextMenuProps>(
  ({ entries, xPos, yPos, toClose }, ref): JSX.Element => {
    ContextMenu.displayName = 'ContextMenu';

    return (
      <div
        ref={ref}
        className='context-menu visible'
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
              toClose();
            }}
          >
            {e.label}
          </div>
        ))}
      </div>
    );
  },
);
