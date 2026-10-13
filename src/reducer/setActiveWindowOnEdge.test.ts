import { setActiveWindowOnEdge } from "./setActiveWindowOnEdge";
import { initialDockingState } from "./types";

describe("setActiveWindowOnEdge", () => {
  test("sets the active window for an edge", () => {
    let state = initialDockingState;
    state = {
      ...state,
      dockedWindows: new Map([
        ["window-1", { id: "window-1", edge: "top", order: 0 }],
        ["window-2", { id: "window-2", edge: "top", order: 1 }],
      ]),
      zOrder: ["window-1", "window-2"],
    };
    const result = setActiveWindowOnEdge(state, {
      type: "setActiveWindowOnEdge",
      edge: "top",
      id: "window-2",
    });
    expect(result.activeWindowsByEdge.get("top")).toBe("window-2");
  });

  test("raises the window in z-order", () => {
    let state = initialDockingState;
    state = {
      ...state,
      dockedWindows: new Map([
        ["window-1", { id: "window-1", edge: "top", order: 0 }],
        ["window-2", { id: "window-2", edge: "top", order: 1 }],
      ]),
      zOrder: ["window-1", "window-2"],
    };
    const result = setActiveWindowOnEdge(state, {
      type: "setActiveWindowOnEdge",
      edge: "top",
      id: "window-1",
    });
    expect(result.zOrder).toEqual(["window-2", "window-1"]);
  });

  test("returns the original state if the window is already active and at the top", () => {
    let state = initialDockingState;
    state = {
      ...state,
      activeWindowsByEdge: new Map([["top", "window-1"]]),
      zOrder: ["window-2", "window-1"],
    };
    const result = setActiveWindowOnEdge(state, {
      type: "setActiveWindowOnEdge",
      edge: "top",
      id: "window-1",
    });
    expect(result).toBe(state);
  });
});
