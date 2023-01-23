[npm]: https://img.shields.io/npm/v/@asup/context-menu
[npm-url]: https://www.npmjs.com/package/@asup/context-menu
[size]: https://packagephobia.now.sh/badge?p=@asup/context-menu
[size-url]: https://packagephobia.now.sh/result?p=@asup/context-menu

[![npm][npm]][npm-url]
[![size][size]][size-url]
![npm bundle size](https://img.shields.io/bundlephobia/min/@asup/context-menu)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://raw.githubusercontent.com/PaulDThomas/context-menu/master/LICENCE)

# @asup/context-menu

REACT Context menu, because I couldn't quite find what I wanted.

## Installation

```
# with npm
npm install @asup/context-menu
```

## Usage

Context menu provider, takes a list of available actions and renders a context menu on appropriate click.

```
import { ContextMenuProvider, iMenuItem, MenuContext } from '@asup/context-menu';

... inside REACT component

<ContextMenuProvider>

  <SomeChild

    const menuContext = useContext(MenuContext);
    const showMenu = useCallback((e) => {
      e.preventDefault();
      e.stopPropagation();
      const menuItems: iMenuItem[] = [
        { label: 'Item 1', action: item1Function },
        { label: 'Item 2', action: item2Function },
        ...
      ];
      menuContext.set && menuContext.set({
          visible: true,
          y: e.pageY,
          x: e.pageX,
          menuItems: menuItems,
        });
    },
    [...]);

    return (
      <div onContextMenu={showMenu}>
      </div>
    );
  >

</ContextMenuProvider>
```

Add an `onContextMenu` action to an element inside the `ContextMenuProvider`, and create a corresponding function that loads the menuItems array and then sets it to visible.
