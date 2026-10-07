import { act, fireEvent, render, screen } from "@testing-library/react";
import { useContext } from "react";
import { ContextWindow } from "./ContextWindow";
import { DockingContext, DockingProvider } from "./DockingContext";
import type { DockEdge, DockingContextType, WindowRect } from "./interface";

type DockingTestApi = DockingContextType & {
  activateWindowOnEdge: (edge: DockEdge, id?: string) => void;
  dock: (id: string, edge: DockEdge, preDockRect?: WindowRect | null) => void;
  endDockDrag: (id: string) => void;
  raiseWindow: (id: string) => void;
  registerWindow: (id: string) => void;
  setActiveWindowOnEdge: (edge: DockEdge, id: string) => void;
  setDockDragEdge: (edge: DockEdge | null) => void;
  setPanelContentHost: (edge: DockEdge, host: HTMLDivElement | null) => void;
  startDockDrag: (id: string) => void;
  toggleAndRaiseEdge: (edge: DockEdge) => void;
  toggleEdgeCollapse: (edge: DockEdge) => void;
  undock: (id: string, options?: { viaDrag?: boolean }) => void;
  unregisterWindow: (id: string) => void;
};

const withDispatchHelpers = (api: DockingContextType): DockingTestApi => ({
  ...api,
  activateWindowOnEdge: (edge, id) => api.dispatch({ type: "activateWindowOnEdge", edge, id }),
  dock: (id, edge, preDockRect) => api.dispatch({ type: "dock", id, edge, preDockRect }),
  endDockDrag: (id) => api.dispatch({ type: "endDockDrag", id }),
  raiseWindow: (id) => api.dispatch({ type: "raiseWindow", id }),
  registerWindow: (id) => api.dispatch({ type: "registerWindow", id }),
  setActiveWindowOnEdge: (edge, id) => api.dispatch({ type: "setActiveWindowOnEdge", edge, id }),
  setDockDragEdge: (edge) => api.dispatch({ type: "setDockDragEdge", edge }),
  setPanelContentHost: (edge, host) => api.dispatch({ type: "setPanelContentHost", edge, host }),
  startDockDrag: (id) => api.dispatch({ type: "startDockDrag", id }),
  toggleAndRaiseEdge: (edge) => api.dispatch({ type: "toggleAndRaiseEdge", edge }),
  toggleEdgeCollapse: (edge) => api.dispatch({ type: "toggleEdgeCollapse", edge }),
  undock: (id, options) => api.dispatch({ type: "undock", id, viaDrag: options?.viaDrag }),
  unregisterWindow: (id) => api.dispatch({ type: "unregisterWindow", id }),
});

describe("DockingProvider", () => {
  let api: DockingTestApi;

  const Capture = (): null => {
    api = withDispatchHelpers(useContext(DockingContext)!);
    return null;
  };

  beforeEach(() => {
    render(
      <DockingProvider>
        <Capture />
      </DockingProvider>,
    );
  });

  test("supplies callable no-op actions for a missing window config", () => {
    const config = api.getWindowConfig("");

    expect(config.title).toBe("window");
    expect(() => {
      config.onDock?.();
      config.onUndock?.();
    }).not.toThrow();
  });

  const ids = (edge: DockEdge) => api.getWindowsOnEdge(edge).map((w) => w.id);
  const rect = { x: 10, y: 20, width: 300, height: 200 };

  describe("docking", () => {
    test("clicking a nested window on the same edge does not activate its parent", () => {
      const innerClick = jest.fn();
      const outerCapture = jest.fn();
      const windows = (innerVisible: boolean) => (
        <DockingProvider>
          <Capture />
          <ContextWindow
            id="outer-window"
            title="Outer window"
            visible
            dockable
            initialDockEdge="left"
            onClickCapture={outerCapture}
          >
            <button>Outer action</button>
            <ContextWindow
              id="inner-window"
              title="Inner window"
              visible={innerVisible}
              dockable
              initialDockEdge="left"
            >
              <button onClick={innerClick}>Inner action</button>
            </ContextWindow>
          </ContextWindow>
        </DockingProvider>
      );
      const { rerender } = render(windows(false));
      rerender(windows(true));
      act(() => {
        api.setActiveWindowOnEdge("left", "inner-window");
      });
      expect(api.getActiveWindowOnEdge("left")).toBe("inner-window");
      expect(
        document.getElementById("outer-window")?.contains(document.getElementById("inner-window")),
      ).toBe(false);

      fireEvent.click(screen.getByText("Inner action"));

      expect(innerClick).toHaveBeenCalledTimes(1);
      expect(outerCapture).toHaveBeenCalledTimes(1);
      expect(api.getActiveWindowOnEdge("left")).toBe("inner-window");
      expect(document.getElementById("inner-window")).toHaveStyle({ display: "flex" });
      expect(document.getElementById("outer-window")).toHaveStyle({ display: "none" });

      act(() => {
        api.setActiveWindowOnEdge("left", "outer-window");
      });
      fireEvent.click(screen.getByText("Outer action"));
      expect(api.getActiveWindowOnEdge("left")).toBe("outer-window");
      expect(outerCapture).toHaveBeenCalledTimes(2);

      act(() => {
        api.setActiveWindowOnEdge("left", "inner-window");
      });
      fireEvent.click(screen.getByText("Outer action"));
      expect(api.getActiveWindowOnEdge("left")).toBe("outer-window");
      expect(outerCapture).toHaveBeenCalledTimes(3);
    });

    test.each<DockEdge>(["top", "left", "right", "bottom"])(
      "automatically renders the %s panel while a window is docked",
      (edge) => {
        expect(screen.queryByRole("separator")).not.toBeInTheDocument();
        expect(api.getPanelContentHost(edge)).toBeNull();

        act(() => {
          api.dock("automatic-panel", edge);
        });

        expect(
          screen.getByRole("separator", { name: `Resize ${edge} dock panel` }),
        ).toBeInTheDocument();
        expect(api.getPanelContentHost(edge)).toBeInstanceOf(HTMLDivElement);

        act(() => {
          api.undock("automatic-panel");
        });

        expect(screen.queryByRole("separator")).not.toBeInTheDocument();
        expect(api.getPanelContentHost(edge)).toBeNull();
      },
    );

    test("dock adds windows to an edge in docking order and makes the newest active", () => {
      act(() => {
        api.dock("a", "left");
        api.dock("b", "left");
        api.dock("c", "right");
      });

      expect(ids("left")).toEqual(["a", "b"]);
      expect(ids("right")).toEqual(["c"]);
      expect(ids("top")).toEqual([]);
      expect(api.getDockedWindow("b")).toMatchObject({ edge: "left", order: 1 });
      expect(api.getDockedWindow("missing")).toBeUndefined();
      expect(api.getActiveWindowOnEdge("left")).toBe("b");
      expect(api.getActiveWindowOnEdge("right")).toBe("c");
      expect(api.getActiveWindowOnEdge("bottom")).toBeNull();
    });

    test("docking a window onto another edge moves it to the end of that edge", () => {
      act(() => {
        api.dock("a", "left");
        api.dock("b", "right");
      });
      act(() => {
        api.dock("a", "right");
      });

      expect(ids("left")).toEqual([]);
      expect(ids("right")).toEqual(["b", "a"]);
      expect(api.getActiveWindowOnEdge("right")).toBe("a");
      expect(api.getActiveWindowOnEdge("left")).toBeNull();
    });

    test("moving the active window to another edge promotes the next window on the old edge", () => {
      act(() => {
        api.dock("a", "left");
        api.dock("b", "left");
      });
      act(() => {
        api.dock("b", "top");
      });

      expect(api.getActiveWindowOnEdge("left")).toBe("a");
      expect(api.getActiveWindowOnEdge("top")).toBe("b");
    });

    test("undocking the active window promotes the next window on the edge", () => {
      act(() => {
        api.dock("a", "bottom");
        api.dock("b", "bottom");
        api.dock("c", "bottom");
      });
      act(() => {
        api.setActiveWindowOnEdge("bottom", "b");
      });
      act(() => {
        api.undock("b");
      });

      expect(ids("bottom")).toEqual(["a", "c"]);
      expect(api.getActiveWindowOnEdge("bottom")).toBe("a");
    });

    test("undocking an inactive window keeps the active window", () => {
      act(() => {
        api.dock("a", "top");
        api.dock("b", "top");
      });
      act(() => {
        api.undock("a");
      });

      expect(ids("top")).toEqual(["b"]);
      expect(api.getActiveWindowOnEdge("top")).toBe("b");
    });

    test("undocking the last window clears the edge's active window and pin", () => {
      act(() => {
        api.dock("a", "left");
        api.toggleEdgeCollapse("left");
      });
      expect(api.isEdgeCollapsed("left")).toBe(true);

      act(() => {
        api.undock("a");
      });

      expect(ids("left")).toEqual([]);
      expect(api.getActiveWindowOnEdge("left")).toBeNull();
      expect(api.isEdgeCollapsed("left")).toBe(false);
    });

    test("undocking a window from a pinned edge that still has windows keeps the pin", () => {
      act(() => {
        api.dock("a", "left");
        api.dock("b", "left");
        api.toggleEdgeCollapse("left");
      });
      act(() => {
        api.undock("a");
      });

      expect(ids("left")).toEqual(["b"]);
      expect(api.isEdgeCollapsed("left")).toBe(true);
    });

    test("undocking an unknown window changes nothing", () => {
      act(() => {
        api.dock("a", "left");
      });
      const windowsBefore = api.getDockedWindow("a");
      act(() => {
        api.undock("missing");
      });

      expect(ids("left")).toEqual(["a"]);
      expect(api.getDockedWindow("a")).toBe(windowsBefore);
    });

    test("docking onto a pinned edge unpins it", () => {
      act(() => {
        api.dock("a", "right");
        api.toggleEdgeCollapse("right");
      });
      expect(api.isEdgeCollapsed("right")).toBe(true);

      act(() => {
        api.dock("b", "right");
      });
      expect(api.isEdgeCollapsed("right")).toBe(false);
    });

    test("toggleEdgeCollapse pins and unpins an edge", () => {
      act(() => {
        api.toggleEdgeCollapse("top");
      });
      expect(api.isEdgeCollapsed("top")).toBe(true);
      expect(api.isEdgeCollapsed("bottom")).toBe(false);
      act(() => {
        api.toggleEdgeCollapse("top");
      });
      expect(api.isEdgeCollapsed("top")).toBe(false);
    });

    test("setActiveWindowOnEdge for the window that is already active is a no-op", () => {
      act(() => {
        api.dock("a", "left");
      });
      const getterBefore = api.getActiveWindowOnEdge;
      act(() => {
        api.setActiveWindowOnEdge("left", "a");
      });
      expect(api.getActiveWindowOnEdge).toBe(getterBefore);
      expect(api.getActiveWindowOnEdge("left")).toBe("a");
    });

    test("re-activating the active window still raises it above the rest", () => {
      act(() => {
        api.registerWindow("a");
        api.registerWindow("b");
        api.dock("a", "left");
        api.raiseWindow("b");
      });
      expect(api.getWindowZIndex("a")).toBeLessThan(api.getWindowZIndex("b") as number);

      act(() => {
        api.setActiveWindowOnEdge("left", "a");
      });
      expect(api.getActiveWindowOnEdge("left")).toBe("a");
      expect(api.getWindowZIndex("a")).toBeGreaterThan(api.getWindowZIndex("b") as number);
    });
  });

  describe("panel content hosts", () => {
    test("hosts are registered, replaced and removed per edge", () => {
      const host = document.createElement("div");
      const otherHost = document.createElement("div");

      act(() => {
        api.setPanelContentHost("left", host);
      });
      expect(api.getPanelContentHost("left")).toBe(host);
      expect(api.getPanelContentHost("right")).toBeNull();

      // Registering the same host again is a no-op
      const getterBefore = api.getPanelContentHost;
      act(() => {
        api.setPanelContentHost("left", host);
      });
      expect(api.getPanelContentHost).toBe(getterBefore);

      act(() => {
        api.setPanelContentHost("left", otherHost);
      });
      expect(api.getPanelContentHost("left")).toBe(otherHost);

      act(() => {
        api.setPanelContentHost("left", null);
      });
      expect(api.getPanelContentHost("left")).toBeNull();
    });
  });

  describe("stacking order", () => {
    test("registered windows stack in registration order and can be raised", () => {
      act(() => {
        api.registerWindow("a");
        api.registerWindow("b");
      });
      expect(api.getWindowZIndex("a")).toBe(3000);
      expect(api.getWindowZIndex("b")).toBe(3001);

      act(() => {
        api.raiseWindow("a");
      });
      expect(api.getWindowZIndex("a")).toBe(3001);
      expect(api.getWindowZIndex("b")).toBe(3000);
    });

    test("raising the top window or an unknown window changes nothing", () => {
      act(() => {
        api.registerWindow("a");
        api.registerWindow("b");
      });
      const getterBefore = api.getWindowZIndex;
      act(() => {
        api.raiseWindow("b");
        api.raiseWindow("missing");
      });
      expect(api.getWindowZIndex).toBe(getterBefore);
    });

    test("re-registering a window is a no-op", () => {
      act(() => {
        api.registerWindow("a");
      });
      const getterBefore = api.getWindowZIndex;
      act(() => {
        api.registerWindow("a");
      });
      expect(api.getWindowZIndex).toBe(getterBefore);
    });

    test("all registered windows use the provider range and share its top slot", () => {
      const CaptureCustomRange = (): null => {
        api = withDispatchHelpers(useContext(DockingContext)!);
        return null;
      };
      render(
        <DockingProvider
          minZIndex={100}
          maxZIndex={101}
        >
          <CaptureCustomRange />
        </DockingProvider>,
      );

      act(() => {
        api.registerWindow("a");
        api.registerWindow("b");
        api.registerWindow("c");
      });
      expect(api.getWindowZIndex("a")).toBe(100);
      expect(api.getWindowZIndex("b")).toBe(101);
      expect(api.getWindowZIndex("c")).toBe(101);
    });

    test("unregistering removes a window from the order, and unknown ids are ignored", () => {
      act(() => {
        api.registerWindow("a");
        api.registerWindow("b");
      });
      act(() => {
        api.unregisterWindow("a");
      });
      expect(api.getWindowZIndex("a")).toBe(3000);
      expect(api.getWindowZIndex("b")).toBe(3000);

      const getterBefore = api.getWindowZIndex;
      act(() => {
        api.unregisterWindow("missing");
      });
      expect(api.getWindowZIndex).toBe(getterBefore);
    });

    test("unregistering a window drops its stored floating rect", () => {
      act(() => {
        api.registerWindow("a");
        api.dock("a", "left", rect);
      });
      expect(api.getPreDockRect("a")).toEqual(rect);

      act(() => {
        api.unregisterWindow("a");
      });
      expect(api.getPreDockRect("a")).toBeNull();
    });

    test("docking and activating a window raises it", () => {
      act(() => {
        api.registerWindow("a");
        api.registerWindow("b");
      });
      act(() => {
        api.dock("a", "left");
      });
      expect(api.getWindowZIndex("a")).toBe(3001);

      act(() => {
        api.dock("b", "left");
      });
      expect(api.getWindowZIndex("b")).toBe(3001);

      act(() => {
        api.setActiveWindowOnEdge("left", "a");
      });
      expect(api.getWindowZIndex("a")).toBe(3001);
      expect(api.getWindowZIndex("b")).toBe(3000);
    });

    test("a panel takes the z-index of the window it is showing", () => {
      act(() => {
        api.registerWindow("a");
        api.registerWindow("b");
        api.dock("a", "left");
        api.dock("b", "right");
      });

      expect(api.getPanelZIndex("left")).toBe(api.getWindowZIndex("a"));
      expect(api.getPanelZIndex("right")).toBe(api.getWindowZIndex("b"));
      // An edge without docked windows has no panel
      expect(api.getPanelZIndex("top")).toBeNull();
    });

    test("an unregistered window uses the provider minimum z-index", () => {
      expect(api.getWindowZIndex("never-registered")).toBe(api.minZIndex);
    });
  });

  describe("window actions", () => {
    test("registers and invokes window actions", () => {
      const onClose = jest.fn();
      const onUndock = jest.fn();
      api.registerWindowActions("a", { onClose, onUndock });
      api.closeWindow("a");
      api.requestUndock("a");
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onUndock).toHaveBeenCalledTimes(1);

      api.unregisterWindowActions("a");
      api.closeWindow("a");
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    test("handles registered actions without onClose callback", () => {
      const onUndock = jest.fn();
      api.registerWindowActions("b", { onUndock });
      api.closeWindow("b");
      api.requestUndock("b");
      expect(onUndock).toHaveBeenCalledTimes(1);
    });

    test("handles registered actions without onUndock callback", () => {
      const onClose = jest.fn();
      api.registerWindowActions("c", { onClose });
      api.closeWindow("c");
      api.requestUndock("c");
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    test("handles registered actions with empty object", () => {
      api.registerWindowActions("d");
      api.closeWindow("d");
      api.requestUndock("d");
      // Should not throw or error
      expect(true).toBe(true);
    });
  });

  describe("pre-dock rects", () => {
    test("the floating rect is captured on the first dock and kept while docked", () => {
      act(() => {
        api.dock("a", "left", rect);
      });
      expect(api.getPreDockRect("a")).toEqual(rect);

      // Switching edges must not overwrite the original floating position
      act(() => {
        api.dock("a", "right", { x: 999, y: 999, width: 1, height: 1 });
      });
      expect(api.getPreDockRect("a")).toEqual(rect);
    });

    test("a drag undock keeps the rect so a re-dock in the same gesture reuses it", () => {
      act(() => {
        api.dock("a", "left", rect);
      });
      act(() => {
        api.undock("a", { viaDrag: true });
      });
      expect(api.getPreDockRect("a")).toEqual(rect);

      act(() => {
        api.dock("a", "top", { x: 999, y: 999, width: 1, height: 1 });
      });
      expect(api.getPreDockRect("a")).toEqual(rect);
    });

    test("a button undock drops the rect", () => {
      act(() => {
        api.dock("a", "left", rect);
      });
      act(() => {
        api.undock("a");
      });
      expect(api.getPreDockRect("a")).toBeNull();
    });

    test("ending a drag with the window floating drops its stale rect", () => {
      act(() => {
        api.dock("a", "left", rect);
      });
      act(() => {
        api.undock("a", { viaDrag: true });
      });
      act(() => {
        api.endDockDrag("a");
      });
      expect(api.getPreDockRect("a")).toBeNull();
    });

    test("ending a drag with the window docked keeps its rect", () => {
      act(() => {
        api.dock("a", "left", rect);
      });
      act(() => {
        api.endDockDrag("a");
      });
      expect(api.getPreDockRect("a")).toEqual(rect);
    });

    test("docking without a rect records nothing", () => {
      act(() => {
        api.dock("a", "left");
      });
      expect(api.getPreDockRect("a")).toBeNull();
    });
  });

  describe("drag to dock indicator", () => {
    const indicator = () => document.querySelector("[class*='dockZoneIndicator']");

    test("no indicator is shown until a drag starts", () => {
      expect(indicator()).toBeNull();
      act(() => {
        api.setDockDragEdge("left");
      });
      expect(indicator()).toBeNull();
    });

    test("the indicator follows the dragged window's snap edge", () => {
      act(() => {
        api.startDockDrag("a");
      });
      expect(indicator()).toBeNull();

      act(() => {
        api.setDockDragEdge("left");
      });
      expect(indicator()).not.toBeNull();

      act(() => {
        api.endDockDrag("a");
      });
      expect(indicator()).toBeNull();
    });

    test("setting the same snap edge twice is a no-op", () => {
      act(() => {
        api.startDockDrag("a");
        api.setDockDragEdge("left");
      });
      const setterBefore = api.setDockDragEdge;
      act(() => {
        api.setDockDragEdge("left");
      });
      expect(api.setDockDragEdge).toBe(setterBefore);
    });

    test("ending a drag that never started is a no-op", () => {
      const getterBefore = api.getPreDockRect;
      act(() => {
        api.endDockDrag("a");
      });
      expect(api.getPreDockRect).toBe(getterBefore);
    });
  });
});
