import { act, fireEvent, render, screen } from "@testing-library/react";
import { useContext } from "react";
import {
  DOCK_PANEL_AUTOHIDE_DISTANCE,
  DOCK_PANEL_MIN_SIZE,
  DOCK_PANEL_VIEWPORT_GAP,
  DockPanel,
} from "./DockPanel";
import { DockingContext, DockingProvider } from "./DockingContext";
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

  describe("pinning", () => {
    let dockingApi: DockingContextType | undefined;

    const CaptureDocking = (): null => {
      dockingApi = useContext(DockingContext);
      return null;
    };

    const renderWithProvider = () => {
      const result = render(
        <DockingProvider>
          <CaptureDocking />
          <DockPanel edge="left" />
        </DockingProvider>,
      );
      act(() => {
        dockingApi!.dock("window-a", "left", "vertical");
        dockingApi!.dock("window-b", "left", "vertical");
      });
      return result;
    };

    const getContent = (container: HTMLElement) =>
      container.querySelector("[class*='dockPanelContent']") as HTMLElement;

    beforeEach(() => {
      jest.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
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
      jest.restoreAllMocks();
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

      act(() => dockingApi!.dock("window-c", "left", "vertical"));

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
    let dockingApi: DockingContextType | undefined;

    const CaptureDocking = (): null => {
      dockingApi = useContext(DockingContext);
      return null;
    };

    beforeEach(() => {
      jest.spyOn(console, "log").mockImplementation(() => {});
    });

    afterEach(() => {
      jest.restoreAllMocks();
      dockingApi = undefined;
    });

    test("only renders for its own edge and is removed when its last window leaves", () => {
      const { container } = render(
        <DockingProvider>
          <CaptureDocking />
          <DockPanel edge="left" />
          <DockPanel edge="right" />
        </DockingProvider>,
      );
      expect(container.querySelector("[class*='dockPanel']")).toBeNull();

      act(() => dockingApi!.dock("window-a", "right", "vertical"));
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
          <DockPanel edge="top" />
        </DockingProvider>,
      );
      expect(dockingApi!.getPanelContentHost?.("top")).toBeNull();

      act(() => dockingApi!.dock("window-a", "top", "horizontal"));
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
          <DockPanel edge="bottom" />
        </DockingProvider>,
      );
      act(() => {
        dockingApi!.dock("window-a", "bottom", "horizontal");
        dockingApi!.dock("window-b", "bottom", "horizontal");
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
          <DockPanel edge="right" />
        </DockingProvider>,
      );
      act(() => dockingApi!.dock("window-a", "right", "vertical"));
      const handle = screen.getByRole("separator", { name: "Resize right dock panel" });
      fireEvent.keyDown(handle, { key: "ArrowLeft", shiftKey: true });
      const panel = container.firstElementChild as HTMLElement;
      const size = panel.style.width;
      expect(size).not.toBe("");

      act(() => dockingApi!.undock("window-a"));
      expect(container.firstElementChild).toBeNull();

      act(() => dockingApi!.dock("window-b", "right", "vertical"));
      expect((container.firstElementChild as HTMLElement).style.width).toBe(size);
    });
  });

  test("treats the first window as active when the provider has no active window", () => {
    const setActiveWindowOnEdge = jest.fn();
    const windows = [
      buildDockedWindow("window-a", "left", 0),
      buildDockedWindow("window-b", "left", 1),
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
      getDockedWindow: (id) => windows.find((window) => window.id === id),
      getWindowsOnEdge: (edge) => windows.filter((window) => window.edge === edge),
      isEdgeCollapsed: () => false,
      toggleEdgeCollapse: () => {},
    };

    render(
      <DockingContext.Provider value={contextValue}>
        <DockPanel edge="left" />
      </DockingContext.Provider>,
    );

    expect(screen.getByRole("button", { name: "window-a" }).className).toContain(
      "activeDockTabButton",
    );
    fireEvent.mouseDown(screen.getByRole("separator"), { button: 0, clientX: 10, clientY: 0 });
    expect(setActiveWindowOnEdge).toHaveBeenCalledWith("left", "window-a");
    fireEvent.mouseUp(document);
  });
});
