import { initialDockingState } from "./types";
import { undock } from "./undock";

describe("undock", () => {
  test("removes a window from the dockedWindows map", () => {
    let state = initialDockingState;
    state = {
      ...state,
      dockedWindows: new Map([["window-1", { id: "window-1", edge: "top", order: 0 }]]),
    };
    const result = undock(state, { type: "undock", id: "window-1" });
    expect(result.dockedWindows.has("window-1")).toBe(false);
  });

  test("deletes the preDockRect when not a drag undock", () => {
    let state = initialDockingState;
    const rect = { x: 10, y: 20, width: 100, height: 200 };
    state = {
      ...state,
      dockedWindows: new Map([["window-1", { id: "window-1", edge: "top", order: 0 }]]),
      preDockRects: new Map([["window-1", rect]]),
    };
    const result = undock(state, { type: "undock", id: "window-1" });
    expect(result.preDockRects.has("window-1")).toBe(false);
  });

  test("preserves preDockRect when via drag", () => {
    let state = initialDockingState;
    const rect = { x: 10, y: 20, width: 100, height: 200 };
    state = {
      ...state,
      dockedWindows: new Map([["window-1", { id: "window-1", edge: "top", order: 0 }]]),
      preDockRects: new Map([["window-1", rect]]),
    };
    const result = undock(state, { type: "undock", id: "window-1", viaDrag: true });
    expect(result.preDockRects.get("window-1")).toEqual(rect);
  });

  test("removes the edge's collapsed state when it becomes empty", () => {
    let state = initialDockingState;
    state = {
      ...state,
      dockedWindows: new Map([["window-1", { id: "window-1", edge: "top", order: 0 }]]),
      collapsedEdges: new Set(["top"]),
    };
    const result = undock(state, { type: "undock", id: "window-1" });
    expect(result.collapsedEdges.has("top")).toBe(false);
  });

  test("keeps the edge's collapsed state when it still has windows", () => {
    let state = initialDockingState;
    state = {
      ...state,
      dockedWindows: new Map([
        ["window-1", { id: "window-1", edge: "top", order: 0 }],
        ["window-2", { id: "window-2", edge: "top", order: 1 }],
      ]),
      collapsedEdges: new Set(["top"]),
    };
    const result = undock(state, { type: "undock", id: "window-1" });
    expect(result.collapsedEdges.has("top")).toBe(true);
  });

  test("returns the original state if the window is not docked", () => {
    const state = initialDockingState;
    const result = undock(state, { type: "undock", id: "window-1" });
    expect(result).toBe(state);
  });
});
