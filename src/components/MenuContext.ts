import React from 'react';
import { iMenuItem } from './interface';

export interface MenuContextProps {
  visible?: boolean;
  x?: number;
  y?: number;
  set?: (ret: { visible?: boolean; x?: number; y?: number; menuItems?: iMenuItem[] }) => void;
}

export const MenuContext = React.createContext<MenuContextProps>({});
