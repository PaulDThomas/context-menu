import { registerWindow } from "./registerWindow";
import { initialDockingState } from "./types";

describe("registerWindow", () => {
  test("registers a window with its z-index range", () => {
    const state = initialDockingState;
    const result = registerWindow(state, {
      type: "registerWindow",
      id: "window-1",
      zRange: { minZIndex: 1000, maxZIndex: 5000 },
    });
    expect(result.zRanges.get("window-1")).toEqual({ minZIndex: 1000, maxZIndex: 5000 });
  });

  test("adds the window to zOrder if not already present", () => {
    let state = initialDockingState;
    state = { ...state, zOrder: ["window-2", "window-3"] };
    const result = registerWindow(state, {
      type: "registerWindow",
      id: "window-1",
      zRange: { minZIndex: 1000, maxZIndex: 5000 },
    });
    expect(result.zOrder).toContain("window-1");
  });

  test("does not duplicate windows in zOrder", () => {
    let state = initialDockingState;
    state = { ...state, zOrder: ["window-1", "window-2"] };
    const result = registerWindow(state, {
      type: "registerWindow",
      id: "window-1",
      zRange: { minZIndex: 2000, maxZIndex: 6000 },
    });
    expect(result.zOrder.filter((id) => id === "window-1").length).toBe(1);
  });

  test("returns the original state if the window is already registered with the same range", () => {
    let state = initialDockingState;
    state = {
      ...state,
      zRanges: new Map([["window-1", { minZIndex: 1000, maxZIndex: 5000 }]]),
    };
    const result = registerWindow(state, {
      type: "registerWindow",
      id: "window-1",
      zRange: { minZIndex: 1000, maxZIndex: 5000 },
    });
    expect(result).toBe(state);
  });

  test("updates the z-index range if it changes", () => {
    let state = initialDockingState;
    state = {
      ...state,
      zRanges: new Map([["window-1", { minZIndex: 1000, maxZIndex: 5000 }]]),
    };
    const result = registerWindow(state, {
      type: "registerWindow",
      id: "window-1",
      zRange: { minZIndex: 2000, maxZIndex: 6000 },
    });
    expect(result.zRanges.get("window-1")).toEqual({ minZIndex: 2000, maxZIndex: 6000 });
  });
});
