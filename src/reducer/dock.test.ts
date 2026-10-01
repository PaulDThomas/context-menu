import { dock } from "./dock";
import { initialDockingState } from "./types";

describe("dock", () => {
  test("docks a window to an edge", () => {
    const state = initialDockingState;
    const result = dock(state, { type: "dock", id: "window-1", edge: "top" });
    expect(result.dockedWindows.get("window-1")).toEqual({
      id: "window-1",
      edge: "top",
      order: 0,
    });
  });

  test("sets the docked window as active on its edge", () => {
    const state = initialDockingState;
    const result = dock(state, { type: "dock", id: "window-1", edge: "left" });
    expect(result.activeWindowsByEdge.get("left")).toBe("window-1");
  });

  test("preserves preDockRect when docking for the first time", () => {
    const state = initialDockingState;
    const rect = { x: 10, y: 20, width: 100, height: 200 };
    const result = dock(state, { type: "dock", id: "window-1", edge: "right", preDockRect: rect });
    expect(result.preDockRects.get("window-1")).toEqual(rect);
  });

  test("does not overwrite existing preDockRect when re-docking", () => {
    let state = initialDockingState;
    const rect1 = { x: 10, y: 20, width: 100, height: 200 };
    state = dock(state, { type: "dock", id: "window-1", edge: "top", preDockRect: rect1 });

    const rect2 = { x: 50, y: 60, width: 200, height: 300 };
    state = dock(state, { type: "dock", id: "window-1", edge: "bottom", preDockRect: rect2 });
    expect(state.preDockRects.get("window-1")).toEqual(rect1);
  });

  test("unpins the edge when docking", () => {
    let state = initialDockingState;
    state = { ...state, collapsedEdges: new Set(["top"]) };
    const result = dock(state, { type: "dock", id: "window-1", edge: "top" });
    expect(result.collapsedEdges.has("top")).toBe(false);
  });

  test("raises the docked window in z-order", () => {
    let state = initialDockingState;
    state = { ...state, zOrder: ["window-a", "window-b"] };
    const result = dock(state, { type: "dock", id: "window-a", edge: "top" });
    expect(result.zOrder).toEqual(["window-b", "window-a"]);
  });

  test("increments order number for windows on the same edge", () => {
    let state = initialDockingState;
    state = dock(state, { type: "dock", id: "window-1", edge: "top" });
    state = dock(state, { type: "dock", id: "window-2", edge: "top" });
    state = dock(state, { type: "dock", id: "window-3", edge: "top" });
    expect(state.dockedWindows.get("window-1")?.order).toBe(0);
    expect(state.dockedWindows.get("window-2")?.order).toBe(1);
    expect(state.dockedWindows.get("window-3")?.order).toBe(2);
  });

  test("does not preserve preDockRect if null", () => {
    const state = initialDockingState;
    const result = dock(state, { type: "dock", id: "window-1", edge: "left", preDockRect: null });
    expect(result.preDockRects.has("window-1")).toBe(false);
  });
});
