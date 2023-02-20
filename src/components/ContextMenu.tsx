import React from 'react';
import { iMenuItem } from './interface';
import { SubMenu } from './SubMenu';

export interface contextMenuProps {
  visible: boolean;
  entries: iMenuItem[];
  xPos: number;
  yPos: number;
  toClose: () => void;
}

export const ContextMenu = React.forwardRef<HTMLDivElement, contextMenuProps>(
  ({ visible, entries, xPos, yPos, toClose }, ref): JSX.Element => {
    ContextMenu.displayName = 'ContextMenu';

    return (
      <div
        ref={ref}
        className={`context-menu${visible ? ' visible' : ''}`}
        style={{
          top: `${yPos}px`,
          left: `${xPos}px`,
        }}
      >
        {entries.map((e, i) => (
          <div
            key={i}
            className='context-menu-item'
            onClick={(ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              e.action && e.action();
              toClose();
            }}
          >
            <span>{e.label}</span>
            {e.group && (
              <SubMenu
                toClose={toClose}
                entries={e.group}
              />
            )}
          </div>
        ))}
      </div>
    );
  },
);
