# ContextWindow + Docking Architecture

## Overview

`ContextWindow` is a floating window wrapper that can either:

- stay in the main document flow as a free-floating window
- register with `DockingProvider` and dock into an edge panel
- be restored to its previous floating position when undocked

The runtime is split between:

- `ContextWindow.tsx` — component wrapper and portal placement
- `useContextWindow.ts` — window lifecycle, docking callbacks, drag state, visibility, stacking
- `useContextWindowDrag.ts` — pointer drag, snap detection, drag-undock logic
- `DockingContext.tsx` — provider and shared edge-panel state
- `reducer/*` — reducer-based state machine for docked windows and z-order
- `DockPanel.tsx` — per-edge panel UI, pinning, resizing, tab switching

## Key state model

The authoritative dock state lives in the reducer and is exposed through `DockingProvider`:

```ts
interface DockingState {
  dockedWindows: Map<string, DockedWindow>;
  activeWindowsByEdge: Map<DockEdge, string>;
  panelContentHosts: Map<DockEdge, HTMLDivElement>;
  preDockRects: Map<string, WindowRect>;
  windowConfigs: Map<string, WindowConfig>;
  zOrder: string[];
  collapsedEdges: Set<DockEdge>;
  dragWindowId: string | null;
  dragSnapEdge: DockEdge | null;
}
```

Important pieces:

- `dockedWindows` is the source of truth for whether a window is docked.
- `preDockRects` preserves the last floating rectangle before docking so undock can restore it.
- `activeWindowsByEdge` picks which window is active in each edge panel.
- `windowConfigs` stores per-window metadata such as `visible`, `moving`, `allowUndock`, `initialDockEdge`, and `defaultDockEdge`.
- `dragSnapEdge` is the transient edge a window is currently being dragged toward, used by the overlay indicator and on-release docking logic.

## Window lifecycle

`ContextWindow` creates a wrapper anchor and renders the actual window as a portal:

```tsx
<div ref={window.divRef}> ... {visible && createPortal(<div ... />, window.portalTarget)} </div>
```

`window.portalTarget` resolves to:

- the `DockPanel` content host for an active docked window
- otherwise `document.body`

This means a docked window is not mounted in the document flow while floating. The panel host handles the actual docked render target while the floating window remains in the provider-managed stacking model.

`useContextWindow` merges provider state and standalone state:

- `docking` from `useOptionalDocking()`
- `standalone` from `useStandaloneContextWindowState()` for non-provider usage
- `stacking` from `useStandaloneWindowZIndex()` for floating z-order

The hook exposes the public controller surface:

```ts
export interface ContextWindowController {
  dock: (edge: DockEdge) => void;
  undock: () => void;
  pushToTop: () => void;
  onTitleMouseDown: (event: React.MouseEvent<HTMLElement>) => void;
  registerWindowConfig: (id: string, config: Partial<WindowConfig>) => void;
  windowVisible: boolean;
  isDocked: boolean;
  dockedWindow: DockedWindow | undefined;
  portalTarget: Element | DocumentFragment;
  zIndex: number;
  moving: boolean;
}
```

## Docking provider and edge panels

`DockingProvider` owns the reducer and per-edge panel settings:

```tsx
const [state, dispatch] = useReducer(dockingReducer, initialDockingState);
const [panelSettings, setPanelSettings] = useState(readPanelSettings);
```

It provides:

- `dispatch` for all reducer actions
- `state` for panel/window ordering and dock metadata
- `maxZIndex` / `minZIndex` for stacking ranges
- `windowControllers` for imperative window registration

After the provider renders its children, it mounts one `DockPanel` for each edge (`top`, `left`, `right`, `bottom`). Each panel is responsible for:

- showing the currently active docked window on that edge
- resizing itself with `useDockPanelResize()`
- pinning/collapsing behavior (`toggleEdgeCollapse`, `toggleAndRaiseEdge`)
- auto-hide when pinned and pointer leaves
- pushing or covering content via `pushContent`

`DockPanel` uses `dispatch({ type: "setPanelContentHost", edge, host })` to keep a stable DOM mount point for the panel content. The panel content host is then used as the portal target for docked windows.

## Docking flow

### 1. Dock request

`handleDock(edge)` is the canonical entry point for docking from a window interaction or imperative handle:

```ts
const handleDock = useCallback(
  (edge: DockEdge) => {
    if (!hasDocking) return;
    const rect = isDocked ? null : windowRef.current?.getBoundingClientRect();
    dispatch({
      type: "dock",
      id,
      edge,
      preDockRect: rect && {
        x: rect.left + window.scrollX,
        y: rect.top + window.scrollY,
        width: rect.width,
        height: rect.height,
      },
    });
  },
  [dispatch, hasDocking, id, isDocked],
);
```

This preserves the floating position before docking. `preDockRect` is kept only once and remembered for the lifetime of the dock.

### 2. Reducer behavior

The reducer `dock()` updates the state by:

- inserting the window into `dockedWindows`
- assigning a per-edge order value
- setting `activeWindowsByEdge.set(edge, id)`
- remembering `preDockRect` when the window is not already docked
- removing any collapse state for that edge
- raising the window in the shared `zOrder`

This is important: the reducer owns the docked state transition; the DOM simply reflects the state.

### 3. Docked render path

Once docked, the window is rendered through the panel content host:

- `isDocked` becomes true
- `portalTarget` changes to the host for the active edge
- the docked modal panel takes over layout and size
- `ContextWindow` toggles styles like `display`, `width`, and `height` based on docked state

When a docked window is inactive on that edge, it is hidden with `display: none` but remains mounted so its state can be restored without a remount.

## Undocking flow

Undocking is intentionally two-phase:

1. capture the restore point (`getPreDockRect(id)`) and any pointer position
2. dispatch `undock` so the reducer releases the panel slot and updates the edge state

```ts
const handleUndock = useCallback(
  (pointer?: { x: number; y: number }) => {
    if (!isDocked || !allowUndock) return;

    const restoreState = getPreDockRect(id);
    if (pointer) {
      pendingFloatingStyleRef.current = {
        left: pointer.x,
        top: pointer.y,
        width: restoreState?.width,
        height: restoreState?.height,
        anchorToPointer: true,
      };
    } else if (restoreState) {
      pendingFloatingStyleRef.current = {
        left: restoreState.x,
        top: restoreState.y,
        width: restoreState.width,
        height: restoreState.height,
      };
    } else {
      pendingFloatingStyleRef.current = {
        left: 0,
        top: 0,
        centerInViewport: true,
      };
    }

    undockViaActionRef.current = !pointer;
    dispatch({ type: "undock", id, viaDrag: !!pointer });
  },
  [allowUndock, dispatch, getPreDockRect, id, isDocked],
);
```

`viaDrag` is significant because drag-based undock should restore the window near the cursor, while button-driven undock restores the saved floating rectangle.

## Drag-docking logic

The drag logic is centralized in `useContextWindowDrag.ts`.

### Mouse interaction pipeline

- `onMouseDown` marks the window as moving and ensures `windowVisible` is true
- `onMouseMove` updates pointer position, checks snap candidates, and moves the floating element
- `onMouseUp` clears the drag state and the overlay target markers
- `onInteractionEnd` resolves the final state and calls `handleDock()` only once

The key guard is:

```ts
if (!isDockedNow && dockable && targetSnapEdgeRef.current) {
  handleDockRef.current(targetSnapEdgeRef.current);
}
```

This prevents a second dock call while a window is already docked or while no snap edge was actually determined.

### Snap detection

During drag, the hook checks both:

- whether the pointer is over a dock panel (`[data-dock-panel-edge]`)
- whether the pointer is near a viewport edge via `detectSnapEdge()`

The logic is intentionally stateful and uses a ref to avoid stale closure values during the interaction:

```ts
const targetSnapEdgeRef = useRef<DockEdge | null>(null);
const snapEdge = panelEdge ?? detectSnapEdge(e.clientX, e.clientY, targetSnapEdgeRef.current);
targetSnapEdgeRef.current = snapEdge;
```

If the pointer leaves the candidate edge, the ref is updated to `null` and the final `onInteractionEnd` no longer docks the window.

### Drag-undock threshold

When a window is already docked, dragging it away from its edge triggers `handleUndock({ x, y })` when the pointer crosses the threshold:

```ts
const UNDOCK_THRESHOLD = 20;
```

The comparison is edge-aware:

- top edge: pointer `clientY > 20`
- bottom edge: pointer `clientY < window.innerHeight - 20`
- left edge: pointer `clientX > 20`
- right edge: pointer `clientX < window.innerWidth - 20`

This avoids accidental undock when the user is simply interacting with the docked panel.

## Visual state and stacking

Docked panels and floating windows share an ordering model:

- each edge panel has its own z-order and active window
- floating windows have a `zIndex` computed from provider min/max values
- `pushToTop()` raises the window in the shared ordering
- `DockZoneIndicator` renders a single shared overlay while a drag is in progress

The reducer actions `raiseWindow`, `startDockDrag`, `setDockDragEdge`, and `endDockDrag` are used to keep global drag and stacking state synchronized. This is the same model used for both floating and docked windows and is intentionally reducer-driven instead of ad hoc DOM manipulation.

## Important invariants for future changes

When changing the docking system, keep these invariants intact:

1. `preDockRects` is the restoration source of truth; do not discard it before an undock is complete.
2. Docked state is derived from `state.dockedWindows`, not from a stale DOM class.
3. `windowConfigs` should be updated through `registerWindowConfig` and not mutated directly.
4. A window should only dock once per interaction: the final `onInteractionEnd` call decides the edge, not the intermediate mouse-move events.
5. Panel content host binding must remain stable while a window is docked; otherwise the portal target will flicker or remount the content.
6. `DockPanel` resizing and collapse state are provider-managed; the panel UI should not independently decide edge state.
7. `ContextWindow` must keep `windowVisible` true long enough for `onInteractionEnd` to fire when a drag starts or a window re-enters the viewport.
