import { act, render, renderHook } from "@testing-library/react";
import { useContext } from "react";
import { DockingContext, DockingProvider } from "./DockingContext";
import type { DockingContextType } from "./interface";
import { useDocking } from "./useDocking";

describe("DockingProvider", () => {
  let api: DockingContextType;

  const Capture = (): null => {
    api = useContext(DockingContext)!;
    return null;
  };

  beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    render(
      <DockingProvider>
        <Capture />
      </DockingProvider>,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const ids = (edge: Parameters<DockingContextType["getWindowsOnEdge"]>[0]) =>
    api.getWindowsOnEdge(edge).map((w) => w.id);

  test("dock adds windows to an edge in docking order and makes the newest active", () => {
    act(() => {
      api.dock("a", "left", "vertical");
      api.dock("b", "left", "horizontal");
      api.dock("c", "right", "vertical");
    });

    expect(ids("left")).toEqual(["a", "b"]);
    expect(ids("right")).toEqual(["c"]);
    expect(ids("top")).toEqual([]);
    expect(api.getDockedWindow("b")).toMatchObject({
      edge: "left",
      stackDirection: "horizontal",
      isCollapsed: false,
    });
    expect(api.getDockedWindow("missing")).toBeUndefined();
    expect(api.getActiveWindowOnEdge?.("left")).toBe("b");
    expect(api.getActiveWindowOnEdge?.("right")).toBe("c");
    expect(api.getActiveWindowOnEdge?.("bottom")).toBeNull();
    expect(api.getWindowActivationCount?.("a")).toBe(1);
  });

  test("docking a window onto another edge moves it to the end of that edge", () => {
    act(() => {
      api.dock("a", "left", "vertical");
      api.dock("b", "right", "vertical");
    });
    act(() => {
      api.dock("a", "right", "vertical");
    });

    expect(ids("left")).toEqual([]);
    expect(ids("right")).toEqual(["b", "a"]);
    expect(api.getActiveWindowOnEdge?.("right")).toBe("a");
    expect(api.getActiveWindowOnEdge?.("left")).toBeNull();
    expect(api.getWindowActivationCount?.("a")).toBe(2);
  });

  test("moving the active window to another edge promotes the next window on the old edge", () => {
    act(() => {
      api.dock("a", "left", "vertical");
      api.dock("b", "left", "vertical");
    });
    act(() => {
      api.dock("b", "top", "horizontal");
    });

    expect(api.getActiveWindowOnEdge?.("left")).toBe("a");
    expect(api.getActiveWindowOnEdge?.("top")).toBe("b");
  });

  test("undocking the active window promotes the next window without activating it", () => {
    act(() => {
      api.dock("a", "bottom", "horizontal");
      api.dock("b", "bottom", "horizontal");
      api.dock("c", "bottom", "horizontal");
    });
    act(() => {
      api.setActiveWindowOnEdge?.("bottom", "b");
    });
    const activationsBefore = api.getWindowActivationCount?.("a");

    act(() => {
      api.undock("b");
    });

    expect(ids("bottom")).toEqual(["a", "c"]);
    expect(api.getActiveWindowOnEdge?.("bottom")).toBe("a");
    // Promotion is not an explicit activation, so the promoted window is not raised
    expect(api.getWindowActivationCount?.("a")).toBe(activationsBefore);
  });

  test("undocking an inactive window keeps the active window", () => {
    act(() => {
      api.dock("a", "top", "horizontal");
      api.dock("b", "top", "horizontal");
    });
    act(() => {
      api.undock("a");
    });

    expect(ids("top")).toEqual(["b"]);
    expect(api.getActiveWindowOnEdge?.("top")).toBe("b");
  });

  test("undocking the last window clears the edge's active window, z-index and pin", () => {
    act(() => {
      api.dock("a", "left", "vertical");
      api.setPanelZIndex?.("left", 3004);
      api.toggleEdgeCollapse("left");
    });
    expect(api.getPanelZIndex?.("left")).toBe(3004);
    expect(api.isEdgeCollapsed("left")).toBe(true);

    act(() => {
      api.undock("a");
    });

    expect(ids("left")).toEqual([]);
    expect(api.getActiveWindowOnEdge?.("left")).toBeNull();
    expect(api.getPanelZIndex?.("left")).toBeNull();
    expect(api.isEdgeCollapsed("left")).toBe(false);
  });

  test("undocking an unknown window changes nothing", () => {
    act(() => {
      api.dock("a", "left", "vertical");
    });
    const stateBefore = api.state;
    act(() => {
      api.undock("missing");
    });

    expect(ids("left")).toEqual(["a"]);
    expect(api.state.dockedWindows).toEqual(stateBefore.dockedWindows);
  });

  test("docking onto a pinned edge unpins it", () => {
    act(() => {
      api.dock("a", "right", "vertical");
      api.toggleEdgeCollapse("right");
    });
    expect(api.isEdgeCollapsed("right")).toBe(true);

    act(() => {
      api.dock("b", "right", "vertical");
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

  test("toggleCollapse flips a docked window's collapsed flag and ignores unknown ids", () => {
    act(() => {
      api.dock("a", "left", "vertical");
    });
    act(() => {
      api.toggleCollapse("a");
      api.toggleCollapse("missing");
    });
    expect(api.getDockedWindow("a")?.isCollapsed).toBe(true);
    expect(api.getDockedWindow("missing")).toBeUndefined();
    act(() => {
      api.toggleCollapse("a");
    });
    expect(api.getDockedWindow("a")?.isCollapsed).toBe(false);
  });

  test("setActiveWindowOnEdge always counts as an activation, even for the active window", () => {
    act(() => {
      api.dock("a", "left", "vertical");
    });
    expect(api.getWindowActivationCount?.("a")).toBe(1);
    act(() => {
      api.setActiveWindowOnEdge?.("left", "a");
    });
    expect(api.getActiveWindowOnEdge?.("left")).toBe("a");
    expect(api.getWindowActivationCount?.("a")).toBe(2);
    expect(api.getWindowActivationCount?.("never-docked")).toBe(0);
  });

  test("panel content hosts are registered and removed per edge", () => {
    const host = document.createElement("div");
    const otherHost = document.createElement("div");

    act(() => {
      api.setPanelContentHost?.("left", host);
    });
    expect(api.getPanelContentHost?.("left")).toBe(host);
    expect(api.getPanelContentHost?.("right")).toBeNull();

    // Registering the same host again is a no-op
    const hostsBefore = api.getPanelContentHost;
    act(() => {
      api.setPanelContentHost?.("left", host);
    });
    expect(api.getPanelContentHost).toBe(hostsBefore);

    act(() => {
      api.setPanelContentHost?.("left", otherHost);
    });
    expect(api.getPanelContentHost?.("left")).toBe(otherHost);

    act(() => {
      api.setPanelContentHost?.("left", null);
    });
    expect(api.getPanelContentHost?.("left")).toBeNull();
  });

  test("panel z-indexes are set, left unchanged when equal, and cleared with null", () => {
    act(() => {
      api.setPanelZIndex?.("top", 3002);
    });
    // An edge without docked windows has no panel, so it reports no z-index
    expect(api.getPanelZIndex?.("top")).toBeNull();

    act(() => {
      api.dock("a", "bottom", "horizontal");
      api.setPanelZIndex?.("bottom", 3001);
    });
    expect(api.getPanelZIndex?.("bottom")).toBe(3001);

    const getterBefore = api.getPanelZIndex;
    act(() => {
      api.setPanelZIndex?.("bottom", 3001);
    });
    expect(api.getPanelZIndex).toBe(getterBefore);

    act(() => {
      api.setPanelZIndex?.("bottom", null);
    });
    expect(api.getPanelZIndex?.("bottom")).toBeNull();
  });
});

describe("useDocking", () => {
  test("returns the docking context inside a DockingProvider", () => {
    const { result } = renderHook(() => useDocking(), { wrapper: DockingProvider });
    expect(typeof result.current.dock).toBe("function");
  });

  test("throws outside a DockingProvider", () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useDocking())).toThrow(
      "useDocking must be used within a DockingProvider",
    );
    jest.restoreAllMocks();
  });
});
