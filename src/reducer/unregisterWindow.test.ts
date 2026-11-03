import { initialDockingState } from "./types";
import { unregisterWindow } from "./unregisterWindow";

describe("unregisterWindow", () => {
  test("removes the window from zOrder", () => {
    let state = initialDockingState;
    state = {
      ...state,
      zOrder: ["window-1", "window-2", "window-3"],
    };
    const result = unregisterWindow(state, { type: "unregisterWindow", id: "window-1" });
    expect(result.zOrder).toEqual(["window-2", "window-3"]);
  });

  test("removes the window's preDockRect", () => {
    let state = initialDockingState;
    state = {
      ...state,
      zOrder: ["window-1"],
      preDockRects: new Map([["window-1", { x: 10, y: 20, width: 100, height: 200 }]]),
    };
    const result = unregisterWindow(state, { type: "unregisterWindow", id: "window-1" });
    expect(result.preDockRects.has("window-1")).toBe(false);
  });

  test("removes the window's config", () => {
    let state = initialDockingState;
    state = {
      ...state,
      zOrder: ["window-1"],
      windowConfigs: new Map([["window-1", { title: "Window 1" }]]),
    };
    const result = unregisterWindow(state, { type: "unregisterWindow", id: "window-1" });
    expect(result.windowConfigs.has("window-1")).toBe(false);
  });

  test("preserves other windows' data", () => {
    let state = initialDockingState;
    state = {
      ...state,
      zOrder: ["window-1", "window-2"],
      preDockRects: new Map([
        ["window-1", { x: 10, y: 20, width: 100, height: 200 }],
        ["window-2", { x: 30, y: 40, width: 200, height: 300 }],
      ]),
      windowConfigs: new Map([
        ["window-1", { title: "Window 1" }],
        ["window-2", { title: "Window 2" }],
      ]),
    };
    const result = unregisterWindow(state, { type: "unregisterWindow", id: "window-1" });
    expect(result.zOrder).toEqual(["window-2"]);
    expect(result.preDockRects.has("window-2")).toBe(true);
    expect(result.windowConfigs.has("window-2")).toBe(true);
  });

  test("returns the original state if the window is not registered", () => {
    const state = initialDockingState;
    const result = unregisterWindow(state, { type: "unregisterWindow", id: "window-1" });
    expect(result).toBe(state);
  });
});
