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
- Draggable `ContextWindow`s that can dock into resizable, pinnable `DockPanel`s on any screen edge.

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

#### `IMenuItem` properties

| Property       | Type                                              | Description                                                                           |
| -------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `label`        | `string \| React.ReactElement`                    | Menu item text or element. Use `<hr />` to render a divider.                          |
| `action`       | `(target?, reactEvent?) => void \| Promise<void>` | Called when the item is clicked.                                                      |
| `disabled`     | `boolean`                                         | When `true` the item is rendered but not interactive.                                 |
| `selected`     | `boolean`                                         | When `true` a `✓` is shown next to the item to indicate it is checked/active.         |
| `selectedIcon` | `React.ReactNode`                                 | Replaces the default `✓` with any custom element or string when the item is selected. |
| `group`        | `IMenuItem[]`                                     | Nested sub-menu items rendered as a flyout.                                           |

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

`ClickForMenu` attaches a click-based menu to any element (useful for toolbar buttons or inline actions). Give each instance a stable `id` so the trigger element can be referenced and cleaned up correctly.

```tsx
import { ClickForMenu, IMenuItem } from "@asup/context-menu";

const clickItems: IMenuItem[] = [
  { label: "Edit", action: () => console.log("Edit") },
  { label: "Delete", action: () => console.log("Delete") },
];

<ClickForMenu
  id="actions-menu"
  menuItems={clickItems}
>
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

A floating, draggable window rendered in a portal. Clicking a window brings it to the front, and windows are kept on-screen when dragged, resized or when the viewport changes.

#### `ContextWindow` properties

| Property             | Type                                     | Default   | Description                                                                                                                   |
| -------------------- | ---------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `id`                 | `string`                                 | —         | Unique window id (also used as the label of its DockPanel tab).                                                               |
| `visible`            | `boolean`                                | —         | Shows/hides the window. Hiding a docked window removes it from its DockPanel.                                                 |
| `title`              | `string`                                 | —         | Title bar text.                                                                                                               |
| `titleElement`       | `React.ReactNode`                        | —         | Optional element rendered in the title bar instead of `title`.                                                                |
| `titleBarButtons`    | `React.ReactNode`                        | —         | Custom controls rendered after dock/undock and before close. Pointer interactions do not start a window drag.                 |
| `onOpen` / `onClose` | `() => void`                             | —         | Called when the window opens / when its close button is clicked.                                                              |
| `dockable`           | `boolean`                                | `true`    | Allows the window to dock into a `DockPanel` when a `DockingProvider` is present.                                             |
| `defaultDockEdge`    | `"top" \| "right" \| "bottom" \| "left"` | `"right"` | Edge targeted by the dock button while floating. The button icon reflects this edge. Requires `dockable`.                     |
| `initialDockEdge`    | `"top" \| "right" \| "bottom" \| "left"` | —         | Opens the window directly inside that edge's `DockPanel` (each time it becomes visible). Requires `dockable`.                 |
| `allowUndock`        | `boolean`                                | `true`    | When `false` a docked window cannot be undocked: no undock button, dragging does not pull it out and `undock()` does nothing. |

#### Imperative handle

Pass a `ref` to control the window from code:

| Method        | Description                                                                                         |
| ------------- | --------------------------------------------------------------------------------------------------- |
| `pushToTop()` | Brings the window to the front.                                                                     |
| `dock(edge)`  | Docks the window (or moves a docked window to another edge). Works even when `allowUndock={false}`. |
| `undock()`    | Undocks the window back to its previous floating position (no-op when `allowUndock={false}`).       |

`DockingProvider` is optional for floating windows. Without one, windows share body-based stacking and are raised on opening, clicking, title-bar dragging, or `pushToTop()`. Dock controls are hidden, `initialDockEdge` is ignored, and `dock()`/`undock()` do nothing. Centred opening and saved floating positions work in both modes.

The default z-index range is **3000–3100** in both modes. For standalone windows, configure the range on the body:

```html
<body
  data-acm-min-z-index="3000"
  data-acm-max-z-index="3100"
></body>
```

Body limits are read whenever a standalone window is raised. Missing or invalid values use the defaults; if the maximum is not above the minimum, it becomes minimum + 100. When another standalone window reaches the maximum, raising resets standalone windows to the minimum before bringing the requested window forward. Reset events synchronise their React state. Provider-managed windows are excluded from this reset and continue to use the provider's `minZIndex`/`maxZIndex` props and shared ordering.

### Docking

Wrap your layout in a `DockingProvider`. The provider automatically includes a `DockPanel` for each screen edge; do not add panels yourself. A panel only renders while at least one window is docked to its edge, and is removed again when the last window leaves (undocked or closed).

```tsx
import { useRef } from "react";
import { ContextWindow, DockingProvider } from "@asup/context-menu";

export function App(): React.ReactElement {
  const toolsRef = useRef<React.ComponentRef<typeof ContextWindow>>(null);

  return (
    <DockingProvider>
      {/* Floating, can be docked by dragging to an edge */}
      <ContextWindow
        id="notes"
        title="Notes"
        visible
        dockable
      >
        Notes content
      </ContextWindow>

      {/* Opens docked to the right, can be undocked */}
      <ContextWindow
        id="tools"
        ref={toolsRef}
        title="Tools"
        visible
        dockable
        initialDockEdge="right"
      >
        Tools content
      </ContextWindow>

      {/* Opens docked to the bottom and stays docked */}
      <ContextWindow
        id="console"
        title="Console"
        visible
        dockable
        initialDockEdge="bottom"
        allowUndock={false}
      >
        Console content
      </ContextWindow>
    </DockingProvider>
  );
}
```

#### Docking and undocking

- **Drag to dock** – drag a dockable window's title bar within 24px of a screen edge; a highlight shows the target edge and releasing docks the window there.
- **Dock button** – the title bar dock button docks the window to `defaultDockEdge` (right by default), with an icon pointing to that edge; `ref.dock(edge)` docks to any edge.
- **Drag to undock** – drag a docked window's title bar away from its edge. The window follows the pointer and can be re-docked to another edge in the same drag, without releasing the mouse.
- **Undock button** / `ref.undock()` – returns the window to its previous floating position, moved fully on-screen if needed. A window that started docked opens below its anchor element.
- **Close** – closing (or unmounting) a docked window removes it from the panel.

#### DockPanel

Each panel has a content area, filled by the active window, and a strip of tab buttons, one per window docked to that edge.

`DockingProvider` loads each edge's size and push/cover preference from local storage on mount, using the key `@asup/context-menu:dock-panels`. Preferences are saved after drag resizing finishes, keyboard resizing, or toggling push/cover mode, and survive page reloads. Saved sizes are clamped to the current viewport. Missing, malformed, or blocked storage falls back to the default size and cover mode without disabling docking. Pin state and docked windows are not persisted.

- **Tabs** – click a tab to show that window. The panel takes the z-index of its visible window, so panels and floating windows stack correctly.
- **Resize** – drag the panel's inner edge (or focus it and use the arrow keys, Shift for larger steps) to change its size. The size is kept between 80px and the viewport size minus 40px, and is remembered while the panel is empty. Clicking the resize handle brings the panel to the front.
- **Push / cover content** - the button beside pin toggles between covering the page (default) and reserving body padding for the panel. Reserved space follows resizing and is released while pinned or empty. The choice is remembered when windows dock again. Existing body padding is restored when push mode ends. Viewport-sized layouts can subtract the `--dock-panel-inset-top`, `--dock-panel-inset-right`, `--dock-panel-inset-bottom`, and `--dock-panel-inset-left` CSS variables (with a `0px` fallback) from their dimensions.
- **Pin / auto-hide** – the pin button hides the window contents and lays the tab strip flat against the screen edge. While pinned, the strip auto-hides to a thin line whenever the pointer is more than 48px away (or leaves the page) and slides back when the pointer approaches or a tab gets keyboard focus. Clicking a tab, or docking another window to the edge, unpins the panel.

#### `DockPanel` properties

| Property | Type                                     | Description                        |
| -------- | ---------------------------------------- | ---------------------------------- |
| `edge`   | `"top" \| "right" \| "bottom" \| "left"` | The screen edge this panel serves. |

#### `useDocking` (Hook)

`useDocking()` returns the `DockingContextType` from the nearest `DockingProvider` (it throws outside a provider). All docking state lives in a single reducer inside the provider, and the hook exposes it as:

| Member                                                            | Description                                                                              |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `dock(id, edge, preDockRect?)` / `undock(id, { viaDrag })`        | Move a window into / out of an edge panel. A drag undock keeps the stored floating rect. |
| `getDockedWindow(id)` / `getWindowsOnEdge(edge)`                  | Inspect what is docked where.                                                            |
| `getActiveWindowOnEdge(edge)` / `setActiveWindowOnEdge(edge, id)` | Read or change the window a panel is showing. Activating a window also raises it.        |
| `isEdgeCollapsed(edge)` / `toggleEdgeCollapse(edge)`              | Read or toggle an edge's pinned (auto-hide) state.                                       |
| `registerWindow(id, zRange)` / `unregisterWindow(id)`             | Join / leave the shared stacking order. `ContextWindow` does this for you.               |
| `raiseWindow(id)`                                                 | Move a window to the top of the stacking order.                                          |
| `getWindowZIndex(id)` / `getPanelZIndex(edge)`                    | The derived z-index of a window, or of the panel showing it (`null` when unknown).       |
| `getPreDockRect(id)`                                              | The floating position a docked window will return to.                                    |
| `startDockDrag(id)` / `setDockDragEdge(edge)` / `endDockDrag(id)` | Drive the shared drop zone indicator the provider renders during a drag.                 |
| `setPanelContentHost(edge, host)` / `getPanelContentHost(edge)`   | Used by `DockPanel` to publish the element docked windows portal into.                   |

Exported types: `DockEdge`, `DockingContextType`.

### Breaking changes in v3

- `DockingProvider` renders all four edge panels automatically. Remove explicit `DockPanel` elements from layouts inside the provider.
- `DockingProvider` owns stacking for its windows. Standalone windows retain body-based raising and reset behaviour.
- `StackDirection`, the `defaultStackDirection` prop and the third argument of `dock(id, edge, stackDirection)` have been removed; a panel's layout follows its edge.
- The context no longer exposes `state`, `toggleCollapse`, `isCollapsed`, `setPanelZIndex` or `getWindowActivationCount`; use `isEdgeCollapsed`/`toggleEdgeCollapse` and the derived `getWindowZIndex`/`getPanelZIndex` instead.
- `ContextWindowHandle.dock` takes a single `edge` argument.
- Per-window `minZIndex`/`maxZIndex` props are replaced by provider props or standalone body attributes. Only standalone windows use `data-context-window*` attributes and the global z-index reset event.

### useMouseMove (Hook)

`useMouseMove` is exported for draggable interactions. The API uses `onMouseDown` / `onMouseMove` / `onMouseUp` names, and the hook now wires both mouse and pointer document listeners during an active drag.

Key behavior:

- Registers both `mousemove` + `pointermove` while active.
- Registers both `mouseup` + `pointerup` while active.
- Restores `userSelect` on the same element that started the drag, even if the release happens on a different target.
- Restores `userSelect` during unmount cleanup if the interaction ends unexpectedly.

```tsx
import { useRef, useState } from "react";
import { useMouseMove } from "@asup/context-menu";

export function DraggablePanel(): React.ReactElement {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);

  const { onMouseDown } = useMouseMove({
    onMouseMove: (e) => {
      setX((prev) => prev + e.movementX);
      setY((prev) => prev + e.movementY);
    },
    onMouseUp: () => {
      // Optional: snap/validate final position.
    },
  });

  return (
    <div
      ref={panelRef}
      style={{
        transform: `translate(${x}px, ${y}px)`,
        width: 220,
        padding: 12,
        border: "1px solid #999",
        borderRadius: 8,
        background: "white",
      }}
    >
      <div
        onMouseDown={onMouseDown}
        onPointerDown={(e) =>
          onMouseDown(e as unknown as React.MouseEvent<HTMLElement | SVGElement>)
        }
        style={{ cursor: "move", fontWeight: 600 }}
      >
        Drag Handle
      </div>
      <div style={{ marginTop: 8 }}>Panel body</div>
    </div>
  );
}
```

See the Storybook for interactive examples and more options.

## Development

Useful scripts (from `package.json`):

- `npm run prepare` — run Husky (prepares Git hooks).
- `npm run storybook` — start Storybook to view component examples.
- `npm run build-storybook` — build a static Storybook site.
- `npm run test` — run Vitest and collect coverage (`vitest run --coverage`).
- `npm run test-watch` — run Vitest in watch mode with coverage (`vitest --watch --coverage --maxWorkers=4`).
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
