import { endDockDrag } from "./endDockDrag";
import { initialDockingState } from "./types";

describe("endDockDrag", () => {
  test("clears drag state", () => {
    let state = initialDockingState;
    state = { ...state, dragWindowId: "window-1", dragSnapEdge: "top" };
    const result = endDockDrag(state, { type: "endDockDrag", id: "window-1" });
    expect(result.dragWindowId).toBeNull();
    expect(result.dragSnapEdge).toBeNull();
  });

  test("deletes preDockRect for a floating window", () => {
    let state = initialDockingState;
    const rect = { x: 10, y: 20, width: 100, height: 200 };
    state = {
      ...state,
      dragWindowId: "window-1",
      dragSnapEdge: "top",
      preDockRects: new Map([["window-1", rect]]),
    };
    const result = endDockDrag(state, { type: "endDockDrag", id: "window-1" });
    expect(result.preDockRects.has("window-1")).toBe(false);
  });

  test("preserves preDockRect for a docked window", () => {
    let state = initialDockingState;
    const rect = { x: 10, y: 20, width: 100, height: 200 };
    state = {
      ...state,
      dragWindowId: "window-1",
      dragSnapEdge: "top",
      dockedWindows: new Map([["window-1", { id: "window-1", edge: "top", order: 0 }]]),
      preDockRects: new Map([["window-1", rect]]),
    };
    const result = endDockDrag(state, { type: "endDockDrag", id: "window-1" });
    expect(result.preDockRects.get("window-1")).toEqual(rect);
  });

  test("returns the original state if nothing changed", () => {
    const state = initialDockingState;
    const result = endDockDrag(state, { type: "endDockDrag", id: "window-1" });
    expect(result).toBe(state);
  });

  test("preserves other windows' preDockRects", () => {
    let state = initialDockingState;
    const rect1 = { x: 10, y: 20, width: 100, height: 200 };
    const rect2 = { x: 30, y: 40, width: 200, height: 300 };
    state = {
      ...state,
      dragWindowId: "window-1",
      dragSnapEdge: "top",
      preDockRects: new Map([
        ["window-1", rect1],
        ["window-2", rect2],
      ]),
    };
    const result = endDockDrag(state, { type: "endDockDrag", id: "window-1" });
    expect(result.preDockRects.get("window-2")).toEqual(rect2);
  });
});
