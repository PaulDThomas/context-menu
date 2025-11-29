[npm]: https://img.shields.io/npm/v/@asup/context-menu
[npm-url]: https://www.npmjs.com/package/@asup/context-menu
[size]: https://packagephobia.now.sh/badge?p=@asup/context-menu
[size-url]: https://packagephobia.now.sh/result?p=@asup/context-menu

[![npm][npm]][npm-url]
[![size][size]][size-url]
![npm bundle size](https://img.shields.io/bundlephobia/min/@asup/context-menu)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://raw.githubusercontent.com/PaulDThomas/context-menu/master/LICENCE)

# @asup/context-menu

A small, highly-configurable React + TypeScript context menu component and helpers.

Key points:

- Works with React 19 (package is built and tested against React 19; React is a peer dependency).
- TypeScript types included.
- Lightweight and focused on accessibility and nested sub-menus.

## Storybook

Run Storybook to see interactive component examples and documentation.

```powershell
# install dependencies
npm install

# run Storybook
npm run storybook

# run tests
npm run test

# build library bundle
npm run build
```

## Installation

Install from npm:

```powershell
npm install @asup/context-menu
```

Note: React and ReactDOM are peer dependencies — install a compatible React version in your application.

## Usage

### ContextMenuHandler

```tsx
import { ContextMenuHandler, IMenuItem } from "@asup/context-menu";

const menuItems: IMenuItem[] = [
  { label: "Item 1", action: () => console.log("Item 1") },
  {
    label: "Item 2",
    action: () => console.log("Item 2"),
    group: [{ label: "Subitem 2.1", action: () => console.log("Subitem 2.1") }],
  },
  { label: "Item 3 (disabled)", disabled: true },
];

<ContextMenuHandler menuItems={menuItems}>
  <div>Right click here to open the menu</div>
</ContextMenuHandler>;
```

### AutoHeight

Use `AutoHeight` to wrap content that may expand/contract — it will manage layout height for smoother transitions.

```tsx
import { AutoHeight } from "@asup/context-menu";

<AutoHeight>
  <div style={{ padding: 12 }}>
    This content can change size; AutoHeight will help the layout adjust smoothly.
  </div>
</AutoHeight>;
```

### ClickForMenu

`ClickForMenu` attaches a click-based menu to any element (useful for toolbar buttons or inline actions).

```tsx
import { ClickForMenu, IMenuItem } from "@asup/context-menu";

const clickItems: IMenuItem[] = [
  { label: "Edit", action: () => console.log("Edit") },
  { label: "Delete", action: () => console.log("Delete") },
];

<ClickForMenu menuItems={clickItems}>
  <button type="button">Actions</button>
</ClickForMenu>;
```

### ContextWindow

```tsx
import { ContextWindow } from "@asup/context-menu";

<ContextWindow
  id="window-1"
  title="Window 1"
  visible={true}
  onClose={() => {}}
>
  Window content
</ContextWindow>;
```

See the Storybook for interactive examples and more options.

## Development

Useful scripts (from `package.json`):

- `npm run prepare` — run Husky (prepares Git hooks).
- `npm run storybook` — start Storybook to view component examples.
- `npm run build-storybook` — build a static Storybook site.
- `npm run test` — run Jest and collect coverage (`jest --collectCoverage=true`).
- `npm run test-watch` — run Jest in watch mode with coverage (`jest --watch --collectCoverage=true --maxWorkers=4`).
- `npm run eslint` — run ESLint over `src` (pattern: `src/**/*.{js,jsx,ts,tsx}`).
- `npm run build` — build the library bundle with Parcel. This script clears the Parcel cache before building (`parcel build src/main.ts`).

## Contributing

Contributions and PRs are welcome. Please follow the repository conventions (linting, types, and tests).

1. Fork the repo and create a feature branch.
2. Run `npm install`.
3. Run and update tests: `npm run test`.
4. Submit a PR and describe your changes.

## License

MIT — see the `LICENCE` file for details.
