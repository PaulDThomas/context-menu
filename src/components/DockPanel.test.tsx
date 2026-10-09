import { act, fireEvent, render, screen } from "@testing-library/react";
import * as dockingHook from "../functions/useDocking";
import { useDocking } from "../functions/useDocking";
import {
  DOCK_PANEL_AUTOHIDE_DISTANCE,
  DOCK_PANEL_MIN_SIZE,
  DOCK_PANEL_VIEWPORT_GAP,
  DockPanel,
} from "./DockPanel";
import { DockingProvider } from "./DockingContext";
import { defaultDocking } from "./__mocks__/mockDocking";
import type { DockEdge, DockedWindow, DockingContextType, WindowRect } from "./interface";

const buildDockedWindow = (
  id: string,
  edge: DockedWindow["edge"],
  order: number,
): DockedWindow => ({
  id,
  edge,
  order,
});

type DockingTestApi = DockingContextType & {
  dock: (id: string, edge: DockEdge, preDockRect?: WindowRect | null) => void;
  undock: (id: string, options?: { viaDrag?: boolean }) => void;
};

const withDispatchHelpers = (api: DockingContextType): DockingTestApi => ({
  ...api,
  dock: (id, edge, preDockRect) => api.dispatch({ type: "dock", id, edge, preDockRect }),
  undock: (id, options) => api.dispatch({ type: "undock", id, viaDrag: options?.viaDrag }),
});

describe("DockPanel", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => vi.restoreAllMocks());

  test("does not render when no windows are docked on the target edge", () => {
    vi.spyOn(dockingHook, "useDocking").mockReturnValue({
      ...defaultDocking,
      getWindowsOnEdge: () => [],
    });
    const { container } = render(<DockPanel edge="left" />);

    expect(container.firstChild).toBeNull();
  });

  test("renders tabs and activates selected docked window", () => {
    const dispatch = vi.fn();
    const windows = [
      buildDockedWindow("window-a", "right", 0),
      buildDockedWindow("window-b", "right", 1),
    ];

    vi.spyOn(dockingHook, "useDocking").mockReturnValue({
      ...defaultDocking,
      dispatch,
      getActiveWindowOnEdge: () => "window-a",
      getDockedWindow: (id) => windows.find((window) => window.id === id),
      getWindowsOnEdge: (edge) => windows.filter((window) => window.edge === edge),
    });
    render(<DockPanel edge="right" />);

    const firstButton = screen.getByRole("button", { name: "window-a" });
    const secondButton = screen.getByRole("button", { name: "window-b" });

    expect(firstButton.className).toContain("activeDockTabButton");
    expect(secondButton.className).not.toContain("activeDockTabButton");

    fireEvent.click(secondButton);

    expect(dispatch).toHaveBeenCalledWith({
      type: "activateWindowOnEdge",
      edge: "right",
      id: "window-b",
    });
  });

  test("uses the first docked window when the edge has no active selection", () => {
    const windows = [
      buildDockedWindow("window-a", "right", 0),
      buildDockedWindow("window-b", "right", 1),
    ];
    vi.spyOn(dockingHook, "useDocking").mockReturnValue({
      ...defaultDocking,
      getActiveWindowOnEdge: () => null,
      getDockedWindow: (id) => windows.find((window) => window.id === id),
      getWindowsOnEdge: (edge) => windows.filter((window) => window.edge === edge),
    });
    render(<DockPanel edge="right" />);

    expect(screen.getByRole("button", { name: "window-a" })).toHaveClass("activeDockTabButton");
    expect(screen.getByRole("button", { name: "window-b" })).not.toHaveClass("activeDockTabButton");
  });

  test.each([
    ["left", "M1 4h6v8", "L13 8"],
    ["right", "M9 4h6v8", "L3 8"],
    ["top", "M4 1h8v6", "L8 12"],
    ["bottom", "M4 9h8v6", "L8 4"],
  ] as const)("layout icons match the %s edge", (edge, coveringPane, pushArrow) => {
    const windows = [buildDockedWindow("window-a", edge, 0)];
    vi.spyOn(dockingHook, "useDocking").mockReturnValue({
      ...defaultDocking,
      getActiveWindowOnEdge: () => "window-a",
      getDockedWindow: (id) => windows.find((window) => window.id === id),
      getWindowsOnEdge: (target) => windows.filter((window) => window.edge === target),
    });
    render(<DockPanel edge={edge} />);
    const toggle = screen.getByRole("button", { name: `Push content with ${edge} dock panel` });
    expect(toggle).toHaveAttribute("title", "Push content");
    expect(toggle.querySelector("path")?.getAttribute("d")).toContain(pushArrow);
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("title", "Cover content");
    expect(toggle.querySelector("path")?.getAttribute("d")).toContain(coveringPane);
  });

  test("applies the z-index of the visible window to the panel", () => {
    const windows = [buildDockedWindow("window-a", "top", 0)];
    vi.spyOn(dockingHook, "useDocking").mockReturnValue({
      ...defaultDocking,
      getActiveWindowOnEdge: () => "window-a",
      getDockedWindow: (id) => windows.find((window) => window.id === id),
      getPanelZIndex: () => 3005,
      getWindowsOnEdge: (edge) => windows.filter((window) => window.edge === edge),
    });

    const { container } = render(<DockPanel edge="top" />);

    expect((container.firstChild as HTMLElement).style.zIndex).toBe("3005");
  });

  describe("resizing", () => {
    const renderPanel = (edge: DockedWindow["edge"]) => {
      const utils = render(<DockPanel edge={edge} />);
      const panel = utils.container.firstChild as HTMLElement;
      vi.spyOn(panel, "getBoundingClientRect").mockReturnValue({
        left: 0,
        top: 0,
        right: 300,
        bottom: 300,
        width: 300,
        height: 300,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      } as DOMRect);
      const handle = screen.getByRole("separator", { name: `Resize ${edge} dock panel` });
      return { panel, handle, unmount: utils.unmount };
    };

    const originalInnerWidth = window.innerWidth;
    const originalInnerHeight = window.innerHeight;

    beforeEach(() => {
      Object.defineProperty(window, "innerWidth", { value: 1000, configurable: true });
      Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
    });

    afterEach(() => {
      Object.defineProperty(window, "innerWidth", {
        value: originalInnerWidth,
        configurable: true,
      });
      Object.defineProperty(window, "innerHeight", {
        value: originalInnerHeight,
        configurable: true,
      });
    });

    test.each([
      ["left", { clientX: 400, clientY: 0 }, "width", "400px"],
      ["right", { clientX: 200, clientY: 0 }, "width", "400px"],
      ["top", { clientX: 0, clientY: 400 }, "height", "400px"],
      ["bottom", { clientX: 0, clientY: 200 }, "height", "400px"],
    ] as const)(
      "dragging the inner edge of a %s panel resizes it",
      (edge, moveTo, dimension, expected) => {
        const windows = [buildDockedWindow("window-a", edge, 0)];
        vi.spyOn(dockingHook, "useDocking").mockReturnValue({
          ...defaultDocking,
          getActiveWindowOnEdge: () => "window-a",
          getDockedWindow: (id) => windows.find((window) => window.id === id),
          getWindowsOnEdge: (target) => windows.filter((window) => window.edge === target),
        });
        const { panel, handle } = renderPanel(edge);
        const isHorizontal = edge === "left" || edge === "right";
        expect(handle.getAttribute("aria-orientation")).toBe(
          isHorizontal ? "vertical" : "horizontal",
        );

        fireEvent.mouseDown(handle, { button: 0, clientX: 300, clientY: 300 });
        expect(document.body.style.cursor).toBe(isHorizontal ? "col-resize" : "row-resize");
        expect(handle.className).toContain("resizeHandleActive");

        fireEvent.mouseMove(document, moveTo);
        expect(panel.style[dimension]).toBe(expected);
        expect(handle.getAttribute("aria-valuenow")).toBe("400");

        fireEvent.mouseUp(document);
        expect(document.body.style.cursor).toBe("");
        expect(handle.className).not.toContain("resizeHandleActive");

        // Listeners are released after mouseup
        fireEvent.mouseMove(document, { clientX: 0, clientY: 0 });
        expect(panel.style[dimension]).toBe(expected);
      },
    );

    test("panel size is clamped between the minimum and the viewport", () => {
      const windows = [buildDockedWindow("window-a", "left", 0)];
      vi.spyOn(dockingHook, "useDocking").mockReturnValue({
        ...defaultDocking,
        getActiveWindowOnEdge: () => "window-a",
        getDockedWindow: (id) => windows.find((window) => window.id === id),
        getWindowsOnEdge: (edge) => windows.filter((window) => window.edge === edge),
      });
      const { panel, handle } = renderPanel("left");

      fireEvent.mouseDown(handle, { button: 0, clientX: 300, clientY: 0 });
      fireEvent.mouseMove(document, { clientX: 5000, clientY: 0 });
      expect(panel.style.width).toBe(`${1000 - DOCK_PANEL_VIEWPORT_GAP}px`);
      fireEvent.mouseMove(document, { clientX: -5000, clientY: 0 });
      expect(panel.style.width).toBe(`${DOCK_PANEL_MIN_SIZE}px`);
      fireEvent.mouseUp(document);
    });

    test("ignores non-primary mouse buttons", () => {
      const windows = [buildDockedWindow("window-a", "left", 0)];
      vi.spyOn(dockingHook, "useDocking").mockReturnValue({
        ...defaultDocking,
        getActiveWindowOnEdge: () => "window-a",
        getDockedWindow: (id) => windows.find((window) => window.id === id),
        getWindowsOnEdge: (edge) => windows.filter((window) => window.edge === edge),
      });
      const { panel, handle } = renderPanel("left");

      fireEvent.mouseDown(handle, { button: 2, clientX: 300, clientY: 0 });
      fireEvent.mouseMove(document, { clientX: 400, clientY: 0 });
      expect(panel.style.width).toBe("");
    });

    test("arrow keys resize the panel towards and away from the viewport centre", () => {
      const windows = [buildDockedWindow("window-a", "bottom", 0)];
      vi.spyOn(dockingHook, "useDocking").mockReturnValue({
        ...defaultDocking,
        getActiveWindowOnEdge: () => "window-a",
        getDockedWindow: (id) => windows.find((window) => window.id === id),
        getWindowsOnEdge: (edge) => windows.filter((window) => window.edge === edge),
      });
      const { panel, handle } = renderPanel("bottom");

      fireEvent.keyDown(handle, { key: "ArrowUp" });
      expect(panel.style.height).toBe("310px");
      fireEvent.keyDown(handle, { key: "ArrowDown", shiftKey: true });
      expect(panel.style.height).toBe("250px");
      // Keys on the other axis and unrelated keys do nothing
      fireEvent.keyDown(handle, { key: "ArrowLeft" });
      fireEvent.keyDown(handle, { key: "Enter" });
      expect(panel.style.height).toBe("250px");
    });

    test("mouse and keyboard interaction on the handle raises the panel", () => {
      const dispatch = vi.fn();
      const windows = [buildDockedWindow("window-a", "right", 0)];
      vi.spyOn(dockingHook, "useDocking").mockReturnValue({
        ...defaultDocking,
        dispatch,
        getActiveWindowOnEdge: () => "window-a",
        getDockedWindow: (id) => windows.find((window) => window.id === id),
        getWindowsOnEdge: (edge) => windows.filter((window) => window.edge === edge),
      });
      render(<DockPanel edge="right" />);

      const handle = screen.getByRole("separator", { name: "Resize right dock panel" });

      fireEvent.mouseDown(handle, { button: 0, clientX: 300, clientY: 0 });
      expect(dispatch).toHaveBeenCalledWith({ type: "activateWindowOnEdge", edge: "right" });
      fireEvent.mouseUp(document);

      dispatch.mockClear();
      fireEvent.keyDown(handle, { key: "ArrowLeft" });
      expect(dispatch).toHaveBeenCalledWith({ type: "activateWindowOnEdge", edge: "right" });

      // Keys that do not resize leave the stacking order alone
      dispatch.mockClear();
      fireEvent.keyDown(handle, { key: "ArrowUp" });
      fireEvent.keyDown(handle, { key: "Enter" });
      expect(dispatch).not.toHaveBeenCalled();
    });

    test("releases document listeners when unmounted mid-resize", () => {
      const windows = [buildDockedWindow("window-a", "right", 0)];
      vi.spyOn(dockingHook, "useDocking").mockReturnValue({
        ...defaultDocking,
        getActiveWindowOnEdge: () => "window-a",
        getDockedWindow: (id) => windows.find((window) => window.id === id),
        getWindowsOnEdge: (edge) => windows.filter((window) => window.edge === edge),
      });
      const { handle, unmount } = renderPanel("right");

      fireEvent.mouseDown(handle, { button: 0, clientX: 300, clientY: 0 });
      expect(document.body.style.cursor).toBe("col-resize");
      unmount();
      expect(document.body.style.cursor).toBe("");
    });
  });

  describe("pinning", () => {
    let dockingApi: DockingTestApi | undefined;

    const CaptureDocking = (): null => {
      dockingApi = withDispatchHelpers(useDocking());
      return null;
    };

    const renderWithProvider = () => {
      const result = render(
        <DockingProvider>
          <CaptureDocking />
        </DockingProvider>,
      );
      act(() => {
        dockingApi!.dock("window-a", "left");
        dockingApi!.dock("window-b", "left");
      });
      return result;
    };

    const getContent = (container: HTMLElement) =>
      container.querySelector("[class*='dockPanelContent']") as HTMLElement;

    beforeEach(() => {
      vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: 30,
        bottom: 500,
        width: 30,
        height: 500,
        toJSON: () => ({}),
      } as DOMRect);
    });

    afterEach(() => {
      vi.restoreAllMocks();
      dockingApi = undefined;
    });

    const getPanel = (container: HTMLElement) => container.firstElementChild as HTMLElement;

    test("pin hides the contents and resize handle without touching the page; unpin restores", () => {
      const { container } = renderWithProvider();

      expect(getContent(container).hidden).toBe(false);
      expect(screen.getByRole("separator")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Pin left dock panel" }));

      const unpinButton = screen.getByRole("button", { name: "Unpin left dock panel" });
      expect(unpinButton).toHaveAttribute("aria-pressed", "true");
      expect(getContent(container).hidden).toBe(true);
      expect(screen.queryByRole("separator")).not.toBeInTheDocument();
      expect(getPanel(container).className).toContain("pinned");
      expect(getPanel(container).className).not.toContain("autoHidden");
      expect(document.body.style.paddingLeft).toBe("");

      fireEvent.click(unpinButton);

      expect(screen.getByRole("button", { name: "Pin left dock panel" })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
      expect(getContent(container).hidden).toBe(false);
      expect(screen.getByRole("separator")).toBeInTheDocument();
    });

    test("a pinned bar auto-hides when the pointer moves away and returns when it comes back", () => {
      const { container } = renderWithProvider();
      fireEvent.click(screen.getByRole("button", { name: "Pin left dock panel" }));

      // Bar spans x 0-30, so the threshold sits at x 78
      fireEvent.mouseMove(document, { clientX: 30 + DOCK_PANEL_AUTOHIDE_DISTANCE, clientY: 200 });
      expect(getPanel(container).className).not.toContain("autoHidden");

      fireEvent.mouseMove(document, {
        clientX: 31 + DOCK_PANEL_AUTOHIDE_DISTANCE,
        clientY: 200,
      });
      expect(getPanel(container).className).toContain("autoHidden");

      fireEvent.mouseMove(document, { clientX: 10, clientY: 200 });
      expect(getPanel(container).className).not.toContain("autoHidden");

      // Diagonal distance from the bar's corner counts too
      fireEvent.mouseMove(document, { clientX: 70, clientY: 540 });
      expect(getPanel(container).className).toContain("autoHidden");
    });

    test("leaving the window hides a pinned bar; unpinned panels never auto-hide", () => {
      const { container } = renderWithProvider();

      fireEvent.mouseMove(document, { clientX: 900, clientY: 200 });
      expect(getPanel(container).className).not.toContain("autoHidden");

      fireEvent.click(screen.getByRole("button", { name: "Pin left dock panel" }));
      fireEvent.mouseOut(document, { relatedTarget: null });
      expect(getPanel(container).className).toContain("autoHidden");

      // Re-pinning starts shown (the pointer is on the pin button) even if it was hidden before
      fireEvent.click(screen.getByRole("button", { name: "Unpin left dock panel" }));
      expect(getPanel(container).className).not.toContain("autoHidden");
      fireEvent.click(screen.getByRole("button", { name: "Pin left dock panel" }));
      expect(getPanel(container).className).not.toContain("autoHidden");
    });

    test("clicking a window button while pinned unpins and shows that window", () => {
      const { container } = renderWithProvider();
      fireEvent.click(screen.getByRole("button", { name: "Pin left dock panel" }));

      fireEvent.click(screen.getByRole("button", { name: "window-a" }));

      expect(dockingApi!.isEdgeCollapsed("left")).toBe(false);
      expect(dockingApi!.getActiveWindowOnEdge?.("left")).toBe("window-a");
      expect(getContent(container).hidden).toBe(false);
    });

    test("docking onto a pinned edge unpins it", () => {
      renderWithProvider();
      fireEvent.click(screen.getByRole("button", { name: "Pin left dock panel" }));

      act(() => dockingApi!.dock("window-c", "left"));

      expect(dockingApi!.isEdgeCollapsed("left")).toBe(false);
      expect(dockingApi!.getActiveWindowOnEdge?.("left")).toBe("window-c");
      expect(screen.getByRole("button", { name: "Pin left dock panel" })).toBeInTheDocument();
    });

    test("removing the last window from a pinned edge removes the panel and clears the pin", () => {
      const { container } = renderWithProvider();
      fireEvent.click(screen.getByRole("button", { name: "Pin left dock panel" }));

      act(() => dockingApi!.undock("window-a"));
      expect(dockingApi!.isEdgeCollapsed("left")).toBe(true);

      act(() => dockingApi!.undock("window-b"));

      expect(container.querySelector("[class*='dockPanel']")).toBeNull();
      expect(dockingApi!.isEdgeCollapsed("left")).toBe(false);
    });

    test("moving the pointer onto another element does not hide a pinned bar", () => {
      const { container } = renderWithProvider();
      fireEvent.click(screen.getByRole("button", { name: "Pin left dock panel" }));

      fireEvent.mouseOut(document, { relatedTarget: document.body });
      expect(getPanel(container).className).not.toContain("autoHidden");
    });

    test("pinning drops the custom panel size and unpinning restores it", () => {
      const { container } = renderWithProvider();
      const handle = screen.getByRole("separator", { name: "Resize left dock panel" });
      fireEvent.keyDown(handle, { key: "ArrowRight", shiftKey: true });
      expect(getPanel(container).style.width).toBe("80px");

      fireEvent.click(screen.getByRole("button", { name: "Pin left dock panel" }));
      expect(getPanel(container).style.width).toBe("");

      fireEvent.click(screen.getByRole("button", { name: "Unpin left dock panel" }));
      expect(getPanel(container).style.width).toBe("80px");
    });
  });

  describe("with the real DockingProvider", () => {
    let dockingApi: DockingTestApi | undefined;

    const CaptureDocking = (): null => {
      dockingApi = withDispatchHelpers(useDocking());
      return null;
    };

    beforeEach(() => {
      vi.spyOn(console, "log").mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
      dockingApi = undefined;
    });

    test.each([
      "not-json",
      "null",
      "[]",
      JSON.stringify({ left: { size: -10, pushContent: "true" } }),
      JSON.stringify({ left: { size: "240", pushContent: null } }),
    ])("ignores invalid saved preferences: %s", (saved) => {
      localStorage.setItem("@asup/context-menu:dock-panels", saved);
      const writes = vi.spyOn(Storage.prototype, "setItem");
      render(
        <DockingProvider>
          <CaptureDocking />
        </DockingProvider>,
      );
      act(() => dockingApi!.dock("window-a", "left"));
      expect(screen.getByRole("separator")).not.toHaveAttribute("aria-valuenow");
      expect(
        screen.getByRole("button", { name: "Push content with left dock panel" }),
      ).toHaveAttribute("aria-pressed", "false");
      expect(writes).not.toHaveBeenCalled();
    });

    test("clamps saved sizes and keeps valid preferences on other edges", () => {
      localStorage.setItem(
        "@asup/context-menu:dock-panels",
        JSON.stringify({
          left: { size: 99999, pushContent: false },
          bottom: { size: 160, pushContent: true },
          right: { size: null, pushContent: false },
        }),
      );
      const { unmount } = render(
        <DockingProvider>
          <CaptureDocking />
        </DockingProvider>,
      );
      act(() => {
        dockingApi!.dock("window-a", "left");
        dockingApi!.dock("window-b", "bottom");
      });
      expect(screen.getByRole("separator", { name: "Resize left dock panel" })).toHaveAttribute(
        "aria-valuenow",
        `${window.innerWidth - DOCK_PANEL_VIEWPORT_GAP}`,
      );
      expect(screen.getByRole("separator", { name: "Resize bottom dock panel" })).toHaveAttribute(
        "aria-valuenow",
        "160",
      );
      expect(
        screen.getByRole("button", { name: "Push content with bottom dock panel" }),
      ).toHaveAttribute("aria-pressed", "true");
      unmount();
    });

    test("panels remain usable when storage reads and writes are blocked", () => {
      vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("Storage blocked");
      });
      const writes = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("Storage blocked");
      });
      const { unmount } = render(
        <DockingProvider>
          <CaptureDocking />
        </DockingProvider>,
      );
      act(() => dockingApi!.dock("window-a", "left"));
      const toggle = screen.getByRole("button", { name: "Push content with left dock panel" });
      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute("aria-pressed", "true");
      expect(writes).toHaveBeenCalledTimes(1);
      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute("aria-pressed", "false");
      unmount();
    });

    test("saves a drag resize only when the drag finishes", () => {
      vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
        width: 240,
        height: 160,
      } as DOMRect);
      const writes = vi.spyOn(Storage.prototype, "setItem");
      render(
        <DockingProvider>
          <CaptureDocking />
        </DockingProvider>,
      );
      act(() => dockingApi!.dock("window-a", "left"));
      fireEvent.mouseDown(screen.getByRole("separator"), { button: 0, clientX: 100, clientY: 0 });
      fireEvent.mouseMove(document, { clientX: 150, clientY: 0 });
      fireEvent.mouseMove(document, { clientX: 180, clientY: 0 });
      expect(writes).not.toHaveBeenCalled();
      fireEvent.mouseUp(document);
      expect(writes).toHaveBeenCalledTimes(1);
      expect(JSON.parse(localStorage.getItem("@asup/context-menu:dock-panels")!).left).toEqual({
        size: 320,
        pushContent: false,
      });
    });

    test.each<DockEdge>(["left", "right", "top", "bottom"])(
      "restores %s panel size and push mode after the provider remounts",
      (edge) => {
        const storageKey = "@asup/context-menu:dock-panels";
        const writes = vi.spyOn(Storage.prototype, "setItem");
        vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
          width: 240,
          height: 160,
        } as DOMRect);
        const mount = () =>
          render(
            <DockingProvider>
              <CaptureDocking />
            </DockingProvider>,
          );
        const first = mount();
        expect(writes).not.toHaveBeenCalled();
        act(() => dockingApi!.dock("window-a", edge));
        expect(writes).not.toHaveBeenCalled();
        fireEvent.click(
          screen.getByRole("button", { name: `Push content with ${edge} dock panel` }),
        );
        const handle = screen.getByRole("separator");
        const keys = {
          left: "ArrowRight",
          right: "ArrowLeft",
          top: "ArrowDown",
          bottom: "ArrowUp",
        };
        fireEvent.keyDown(handle, { key: keys[edge] });
        const size = edge === "left" || edge === "right" ? 250 : 170;
        expect(JSON.parse(localStorage.getItem(storageKey)!)[edge]).toEqual({
          size,
          pushContent: true,
        });
        const writeCount = writes.mock.calls.length;
        act(() => dockingApi!.undock("window-a"));
        expect(writes).toHaveBeenCalledTimes(writeCount);
        first.unmount();

        const second = mount();
        act(() => dockingApi!.dock("window-b", edge));
        expect(screen.getByRole("separator")).toHaveAttribute("aria-valuenow", `${size}`);
        expect(
          screen.getByRole("button", { name: `Push content with ${edge} dock panel` }),
        ).toHaveAttribute("aria-pressed", "true");
        expect(writes).toHaveBeenCalledTimes(writeCount);
        second.unmount();
      },
    );

    test.each<DockEdge>(["left", "right", "top", "bottom"])(
      "%s panel toggles body spacing and restores it when emptied or unmounted",
      (edge) => {
        const property = `padding-${edge}`;
        const inset = `--dock-panel-inset-${edge}`;
        document.body.style.setProperty(property, "7px");
        vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
          width: 240,
          height: 160,
        } as DOMRect);
        const { unmount } = render(
          <DockingProvider>
            <CaptureDocking />
          </DockingProvider>,
        );
        act(() => dockingApi!.dock("window-a", edge));
        const toggle = screen.getByRole("button", { name: `Push content with ${edge} dock panel` });
        expect(toggle).toHaveAttribute("aria-pressed", "false");
        expect(document.body.style.getPropertyValue(property)).toBe("7px");

        fireEvent.click(toggle);
        const size = edge === "left" || edge === "right" ? 240 : 160;
        expect(toggle).toHaveAttribute("aria-pressed", "true");
        expect(document.body.style.getPropertyValue(property)).toBe(`${size + 7}px`);
        expect(document.body.style.getPropertyValue(inset)).toBe(`${size}px`);

        fireEvent.click(toggle);
        expect(document.body.style.getPropertyValue(property)).toBe("7px");
        fireEvent.click(toggle);
        act(() => dockingApi!.undock("window-a"));
        expect(document.body.style.getPropertyValue(property)).toBe("7px");
        expect(document.body.style.getPropertyValue(inset)).toBe("");
        act(() => dockingApi!.dock("window-a", edge));
        expect(document.body.style.getPropertyValue(property)).toBe(`${size + 7}px`);
        unmount();
        expect(document.body.style.getPropertyValue(property)).toBe("7px");
        document.body.style.removeProperty(property);
      },
    );

    test("push spacing follows panel resizing and is released while pinned", () => {
      const rect = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
        width: 240,
        height: 160,
      } as DOMRect);
      render(
        <DockingProvider>
          <CaptureDocking />
        </DockingProvider>,
      );
      act(() => dockingApi!.dock("window-a", "left"));
      fireEvent.click(screen.getByRole("button", { name: "Push content with left dock panel" }));
      expect(document.body.style.paddingLeft).toBe("240px");
      rect.mockReturnValue({ width: 300, height: 160 } as DOMRect);
      fireEvent.keyDown(screen.getByRole("separator"), { key: "ArrowRight" });
      expect(document.body.style.paddingLeft).toBe("300px");
      rect.mockReturnValue({ width: 320, height: 160 } as DOMRect);
      fireEvent(window, new Event("resize"));
      expect(document.body.style.paddingLeft).toBe("320px");
      fireEvent.click(screen.getByRole("button", { name: "Pin left dock panel" }));
      expect(document.body.style.paddingLeft).toBe("");
      fireEvent.click(screen.getByRole("button", { name: "Unpin left dock panel" }));
      expect(document.body.style.paddingLeft).toBe("320px");
    });

    test("only renders for its own edge and is removed when its last window leaves", () => {
      const { container } = render(
        <DockingProvider>
          <CaptureDocking />
        </DockingProvider>,
      );
      expect(container.querySelector("[class*='dockPanel']")).toBeNull();

      act(() => dockingApi!.dock("window-a", "right"));
      expect(screen.queryByRole("button", { name: "Pin left dock panel" })).toBeNull();
      expect(screen.getByRole("button", { name: "Pin right dock panel" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "window-a" })).toBeInTheDocument();

      act(() => dockingApi!.undock("window-a"));
      expect(container.querySelector("[class*='dockPanel']")).toBeNull();
    });

    test("registers its content area as the portal host for docked windows", () => {
      const { container, unmount } = render(
        <DockingProvider>
          <CaptureDocking />
        </DockingProvider>,
      );
      expect(dockingApi!.getPanelContentHost?.("top")).toBeNull();

      act(() => dockingApi!.dock("window-a", "top"));
      const content = container.querySelector("[class*='dockPanelContent']");
      expect(content).not.toBeNull();
      expect(dockingApi!.getPanelContentHost?.("top")).toBe(content);

      act(() => dockingApi!.undock("window-a"));
      expect(dockingApi!.getPanelContentHost?.("top")).toBeNull();
      unmount();
    });

    test("tabs follow docking order and mark the active window", () => {
      render(
        <DockingProvider>
          <CaptureDocking />
        </DockingProvider>,
      );
      act(() => {
        dockingApi!.dock("window-a", "bottom");
        dockingApi!.dock("window-b", "bottom");
      });

      const tabs = screen
        .getAllByRole("button")
        .filter((button) => button.title.startsWith("Activate"));
      expect(tabs.map((tab) => tab.textContent)).toEqual(["window-a", "window-b"]);
      expect(tabs[1].className).toContain("activeDockTabButton");

      fireEvent.click(tabs[0]);
      expect(dockingApi!.getActiveWindowOnEdge?.("bottom")).toBe("window-a");
      expect(tabs[0].className).toContain("activeDockTabButton");
      expect(tabs[1].className).not.toContain("activeDockTabButton");
    });

    test("remembers its size while empty and reuses it when a window docks again", () => {
      const { container } = render(
        <DockingProvider>
          <CaptureDocking />
        </DockingProvider>,
      );
      act(() => dockingApi!.dock("window-a", "right"));
      const handle = screen.getByRole("separator", { name: "Resize right dock panel" });
      fireEvent.keyDown(handle, { key: "ArrowLeft", shiftKey: true });
      const panel = container.firstElementChild as HTMLElement;
      const size = panel.style.width;
      expect(size).not.toBe("");

      act(() => dockingApi!.undock("window-a"));
      expect(container.firstElementChild).toBeNull();

      act(() => dockingApi!.dock("window-b", "right"));
      expect((container.firstElementChild as HTMLElement).style.width).toBe(size);
    });

    test("observes a pushed panel and disconnects on unmount", () => {
      const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, "ResizeObserver");
      const observe = vi.fn();
      const disconnect = vi.fn();
      class MockResizeObserver {
        constructor(_callback: ResizeObserverCallback) {}
        observe = observe;
        disconnect = disconnect;
        unobserve = vi.fn();
      }
      Object.defineProperty(globalThis, "ResizeObserver", {
        configurable: true,
        value: MockResizeObserver,
      });

      try {
        const { unmount } = render(
          <DockingProvider>
            <CaptureDocking />
          </DockingProvider>,
        );
        act(() => dockingApi!.dock("window-a", "left"));
        fireEvent.click(screen.getByRole("button", { name: "Push content with left dock panel" }));
        expect(observe).toHaveBeenCalledWith(expect.any(HTMLElement));

        unmount();
        expect(disconnect).toHaveBeenCalled();
      } finally {
        if (originalDescriptor) {
          Object.defineProperty(globalThis, "ResizeObserver", originalDescriptor);
        } else {
          Reflect.deleteProperty(globalThis, "ResizeObserver");
        }
      }
    });
  });

  test("treats the first window as active when the provider has no active window", () => {
    const dispatch = vi.fn();
    const windows = [
      buildDockedWindow("window-a", "left", 0),
      buildDockedWindow("window-b", "left", 1),
    ];
    vi.spyOn(dockingHook, "useDocking").mockReturnValue({
      ...defaultDocking,
      dispatch,
      getDockedWindow: (id) => windows.find((window) => window.id === id),
      getWindowsOnEdge: (edge) => windows.filter((window) => window.edge === edge),
    });
    render(<DockPanel edge="left" />);

    expect(screen.getByRole("button", { name: "window-a" }).className).toContain(
      "activeDockTabButton",
    );
    fireEvent.mouseDown(screen.getByRole("separator"), { button: 0, clientX: 10, clientY: 0 });
    expect(dispatch).toHaveBeenCalledWith({ type: "activateWindowOnEdge", edge: "left" });
    fireEvent.mouseUp(document);
  });
});
