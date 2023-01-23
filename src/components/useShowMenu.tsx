import { MouseEvent } from 'react';
import { MenuContextProps } from './MenuContext';
import { iMenuItem } from '../main';

export function useShowMenu(menuContext: MenuContextProps, menuItems: iMenuItem[]) {
  return (e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    menuContext.set &&
      menuContext.set({
        visible: true,
        y: e.pageY,
        x: e.pageX,
        menuItems,
      });
  };
}
