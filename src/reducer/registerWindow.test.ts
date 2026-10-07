import { registerWindow } from "./registerWindow";
import { initialDockingState } from "./types";

describe("registerWindow", () => {
  test("registers a window in the shared z-order", () => {
    const state = initialDockingState;
    const result = registerWindow(state, {
      type: "registerWindow",
      id: "window-1",
    });
    expect(result.zOrder).toEqual(["window-1"]);
  });

  test("adds the window to zOrder if not already present", () => {
    let state = initialDockingState;
    state = { ...state, zOrder: ["window-2", "window-3"] };
    const result = registerWindow(state, {
      type: "registerWindow",
      id: "window-1",
    });
    expect(result.zOrder).toContain("window-1");
  });

  test("does not duplicate windows in zOrder", () => {
    let state = initialDockingState;
    state = { ...state, zOrder: ["window-1", "window-2"] };
    const result = registerWindow(state, {
      type: "registerWindow",
      id: "window-1",
    });
    expect(result.zOrder.filter((id) => id === "window-1").length).toBe(1);
  });

  test("returns the original state if the window is already registered", () => {
    let state = initialDockingState;
    state = { ...state, zOrder: ["window-1"] };
    const result = registerWindow(state, {
      type: "registerWindow",
      id: "window-1",
    });
    expect(result).toBe(state);
  });
});
