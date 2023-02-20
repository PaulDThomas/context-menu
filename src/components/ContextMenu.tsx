import React from 'react';
import { iMenuItem } from './interface';
import { SubMenu } from './SubMenu';

export interface contextMenuProps {
  visible: boolean;
  entries: iMenuItem[];
  target: Range | null;
  xPos: number;
  yPos: number;
  toClose: () => void;
}

export const ContextMenu = React.forwardRef<HTMLDivElement, contextMenuProps>(
  ({ visible, entries, target, xPos, yPos, toClose }, ref): JSX.Element => {
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
            className={`context-menu-item${e.disabled ? ' disabled' : ''}`}
            onClickCapture={(ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              e.action && !e.disabled && e.action(target);
              !e.disabled && toClose();
            }}
          >
            <span>{e.label}</span>
            {e.group && (
              <SubMenu
                toClose={toClose}
                entries={e.group}
                target={target}
              />
            )}
          </div>
        ))}
      </div>
    );
  },
);
