import { raiseWindow } from "./raiseWindow";
import { initialDockingState } from "./types";

describe("raiseWindow", () => {
  test("moves a window to the end of the z-order", () => {
    let state = initialDockingState;
    state = { ...state, zOrder: ["window-1", "window-2", "window-3"] };
    const result = raiseWindow(state, { type: "raiseWindow", id: "window-1" });
    expect(result.zOrder).toEqual(["window-2", "window-3", "window-1"]);
  });

  test("returns the original state if the window is already at the top", () => {
    let state = initialDockingState;
    state = { ...state, zOrder: ["window-1", "window-2", "window-3"] };
    const result = raiseWindow(state, { type: "raiseWindow", id: "window-3" });
    expect(result).toBe(state);
  });

  test("returns the original state if the window is not in zOrder", () => {
    let state = initialDockingState;
    state = { ...state, zOrder: ["window-1", "window-2"] };
    const result = raiseWindow(state, { type: "raiseWindow", id: "window-3" });
    expect(result).toBe(state);
  });

  test("handles single-window z-order", () => {
    let state = initialDockingState;
    state = { ...state, zOrder: ["window-1"] };
    const result = raiseWindow(state, { type: "raiseWindow", id: "window-1" });
    expect(result).toBe(state);
  });
});
