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
Sub menus can be added within each item.
Wrap around the elements that need to have the menu.

```
import { ContextMenuProvider, iMenuItem } from '@asup/context-menu';

<ContextMenuHandler
  menuItems={[
    {
      label: 'Item 1',
      action: () => {
        console.log('Item 1 function run');
      },
    },
    {
      label: 'Item 2',
      action: () => console.log('Item 2 function run'),
      group: [
        { label: 'Subitem 2.1', action: () => console.log('Item 2.1 function run') },
      ],
    },
    {
      label: 'Item 3',
      action: () => console.log('Item 3 function run'),
      disabled: true,
    },
  ]}
>
  <Chilren
    where the context menu is applied...
  />
</ContextMenuHandler>

```
