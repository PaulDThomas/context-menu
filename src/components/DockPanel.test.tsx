import { fireEvent, render, screen } from "@testing-library/react";
import { DOCK_PANEL_MIN_SIZE, DOCK_PANEL_VIEWPORT_GAP, DockPanel } from "./DockPanel";
import { DockingContext } from "./DockingContext";
import type { DockedWindow, DockingContextType } from "./interface";

const buildDockedWindow = (
  id: string,
  edge: DockedWindow["edge"],
  order: number,
): DockedWindow => ({
  id,
  edge,
  order,
  stackDirection: "vertical",
  isCollapsed: false,
});

describe("DockPanel", () => {
  test("does not render when no windows are docked on the target edge", () => {
    const contextValue: DockingContextType = {
      state: {
        dockedWindows: new Map(),
        collapsedEdges: new Set(),
      },
      dock: () => {},
      undock: () => {},
      toggleCollapse: () => {},
      getDockedWindow: () => undefined,
      getWindowsOnEdge: () => [],
      isEdgeCollapsed: () => false,
      toggleEdgeCollapse: () => {},
    };

    const { container } = render(
      <DockingContext.Provider value={contextValue}>
        <DockPanel edge="left" />
      </DockingContext.Provider>,
    );

    expect(container.firstChild).toBeNull();
  });

  test("renders tabs and activates selected docked window", () => {
    const setActiveWindowOnEdge = jest.fn();
    const windows = [
      buildDockedWindow("window-a", "right", 0),
      buildDockedWindow("window-b", "right", 1),
    ];

    const contextValue: DockingContextType = {
      state: {
        dockedWindows: new Map(
          windows.map((window): [string, DockedWindow] => [window.id, window]),
        ),
        collapsedEdges: new Set(),
      },
      dock: () => {},
      undock: () => {},
      toggleCollapse: () => {},
      setActiveWindowOnEdge,
      getActiveWindowOnEdge: () => "window-a",
      setPanelContentHost: () => {},
      getPanelContentHost: () => null,
      getDockedWindow: (id) => windows.find((window) => window.id === id),
      getWindowsOnEdge: (edge) => windows.filter((window) => window.edge === edge),
      isEdgeCollapsed: () => false,
      toggleEdgeCollapse: () => {},
    };

    render(
      <DockingContext.Provider value={contextValue}>
        <DockPanel edge="right" />
      </DockingContext.Provider>,
    );

    const firstButton = screen.getByRole("button", { name: "window-a" });
    const secondButton = screen.getByRole("button", { name: "window-b" });

    expect(firstButton.className).toContain("activeDockTabButton");
    expect(secondButton.className).not.toContain("activeDockTabButton");

    fireEvent.click(secondButton);

    expect(setActiveWindowOnEdge).toHaveBeenCalledWith("right", "window-b");
  });

  test("applies the z-index of the visible window to the panel", () => {
    const windows = [buildDockedWindow("window-a", "top", 0)];
    const contextValue: DockingContextType = {
      state: {
        dockedWindows: new Map(
          windows.map((window): [string, DockedWindow] => [window.id, window]),
        ),
        collapsedEdges: new Set(),
      },
      dock: () => {},
      undock: () => {},
      toggleCollapse: () => {},
      getPanelZIndex: (edge) => (edge === "top" ? 3005 : null),
      getDockedWindow: (id) => windows.find((window) => window.id === id),
      getWindowsOnEdge: (edge) => windows.filter((window) => window.edge === edge),
      isEdgeCollapsed: () => false,
      toggleEdgeCollapse: () => {},
    };

    const { container } = render(
      <DockingContext.Provider value={contextValue}>
        <DockPanel edge="top" />
      </DockingContext.Provider>,
    );

    expect((container.firstChild as HTMLElement).style.zIndex).toBe("3005");
  });

  describe("resizing", () => {
    const renderPanel = (edge: DockedWindow["edge"]) => {
      const windows = [buildDockedWindow("window-a", edge, 0)];
      const contextValue: DockingContextType = {
        state: {
          dockedWindows: new Map(
            windows.map((window): [string, DockedWindow] => [window.id, window]),
          ),
          collapsedEdges: new Set(),
        },
        dock: () => {},
        undock: () => {},
        toggleCollapse: () => {},
        getDockedWindow: (id) => windows.find((window) => window.id === id),
        getWindowsOnEdge: (target) => windows.filter((window) => window.edge === target),
        isEdgeCollapsed: () => false,
        toggleEdgeCollapse: () => {},
      };
      const utils = render(
        <DockingContext.Provider value={contextValue}>
          <DockPanel edge={edge} />
        </DockingContext.Provider>,
      );
      const panel = utils.container.firstChild as HTMLElement;
      jest.spyOn(panel, "getBoundingClientRect").mockReturnValue({
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
      const { panel, handle } = renderPanel("left");

      fireEvent.mouseDown(handle, { button: 0, clientX: 300, clientY: 0 });
      fireEvent.mouseMove(document, { clientX: 5000, clientY: 0 });
      expect(panel.style.width).toBe(`${1000 - DOCK_PANEL_VIEWPORT_GAP}px`);
      fireEvent.mouseMove(document, { clientX: -5000, clientY: 0 });
      expect(panel.style.width).toBe(`${DOCK_PANEL_MIN_SIZE}px`);
      fireEvent.mouseUp(document);
    });

    test("ignores non-primary mouse buttons", () => {
      const { panel, handle } = renderPanel("left");

      fireEvent.mouseDown(handle, { button: 2, clientX: 300, clientY: 0 });
      fireEvent.mouseMove(document, { clientX: 400, clientY: 0 });
      expect(panel.style.width).toBe("");
    });

    test("arrow keys resize the panel towards and away from the viewport centre", () => {
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
      const setActiveWindowOnEdge = jest.fn();
      const windows = [buildDockedWindow("window-a", "right", 0)];
      const contextValue: DockingContextType = {
        state: {
          dockedWindows: new Map(
            windows.map((window): [string, DockedWindow] => [window.id, window]),
          ),
          collapsedEdges: new Set(),
        },
        dock: () => {},
        undock: () => {},
        toggleCollapse: () => {},
        setActiveWindowOnEdge,
        getActiveWindowOnEdge: () => "window-a",
        getDockedWindow: (id) => windows.find((window) => window.id === id),
        getWindowsOnEdge: (edge) => windows.filter((window) => window.edge === edge),
        isEdgeCollapsed: () => false,
        toggleEdgeCollapse: () => {},
      };

      render(
        <DockingContext.Provider value={contextValue}>
          <DockPanel edge="right" />
        </DockingContext.Provider>,
      );

      const handle = screen.getByRole("separator", { name: "Resize right dock panel" });

      fireEvent.mouseDown(handle, { button: 0, clientX: 300, clientY: 0 });
      expect(setActiveWindowOnEdge).toHaveBeenCalledWith("right", "window-a");
      fireEvent.mouseUp(document);

      setActiveWindowOnEdge.mockClear();
      fireEvent.keyDown(handle, { key: "ArrowLeft" });
      expect(setActiveWindowOnEdge).toHaveBeenCalledWith("right", "window-a");

      // Keys that do not resize leave the stacking order alone
      setActiveWindowOnEdge.mockClear();
      fireEvent.keyDown(handle, { key: "ArrowUp" });
      fireEvent.keyDown(handle, { key: "Enter" });
      expect(setActiveWindowOnEdge).not.toHaveBeenCalled();
    });

    test("releases document listeners when unmounted mid-resize", () => {
      const { handle, unmount } = renderPanel("right");

      fireEvent.mouseDown(handle, { button: 0, clientX: 300, clientY: 0 });
      expect(document.body.style.cursor).toBe("col-resize");
      unmount();
      expect(document.body.style.cursor).toBe("");
    });
  });
});
