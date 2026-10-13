import { activateWindowOnEdge } from "./activateWindowOnEdge";
import { initialDockingState } from "./types";

describe("activateWindowOnEdge", () => {
  test("activates a specific window on an edge", () => {
    let state = initialDockingState;
    state = {
      ...state,
      dockedWindows: new Map([
        ["window-1", { id: "window-1", edge: "top", order: 0 }],
        ["window-2", { id: "window-2", edge: "top", order: 1 }],
      ]),
      zOrder: ["window-1", "window-2"],
    };
    const result = activateWindowOnEdge(state, {
      type: "activateWindowOnEdge",
      edge: "top",
      id: "window-2",
    });
    expect(result.activeWindowsByEdge.get("top")).toBe("window-2");
  });

  test("unpins the edge when activating a window", () => {
    let state = initialDockingState;
    state = {
      ...state,
      dockedWindows: new Map([["window-1", { id: "window-1", edge: "top", order: 0 }]]),
      collapsedEdges: new Set(["top"]),
      zOrder: ["window-1"],
    };
    const result = activateWindowOnEdge(state, {
      type: "activateWindowOnEdge",
      edge: "top",
      id: "window-1",
    });
    expect(result.collapsedEdges.has("top")).toBe(false);
  });

  test("uses the currently active window when no id is provided", () => {
    let state = initialDockingState;
    state = {
      ...state,
      dockedWindows: new Map([
        ["window-1", { id: "window-1", edge: "top", order: 0 }],
        ["window-2", { id: "window-2", edge: "top", order: 1 }],
      ]),
      activeWindowsByEdge: new Map([["top", "window-2"]]),
      zOrder: ["window-1", "window-2"],
    };
    const result = activateWindowOnEdge(state, {
      type: "activateWindowOnEdge",
      edge: "top",
    });
    expect(result.activeWindowsByEdge.get("top")).toBe("window-2");
  });

  test("uses the first window when no active window exists", () => {
    let state = initialDockingState;
    state = {
      ...state,
      dockedWindows: new Map([
        ["window-1", { id: "window-1", edge: "top", order: 0 }],
        ["window-2", { id: "window-2", edge: "top", order: 1 }],
      ]),
      zOrder: ["window-1", "window-2"],
    };
    const result = activateWindowOnEdge(state, {
      type: "activateWindowOnEdge",
      edge: "top",
    });
    expect(result.activeWindowsByEdge.get("top")).toBe("window-1");
  });

  test("raises the activated window in z-order", () => {
    let state = initialDockingState;
    state = {
      ...state,
      dockedWindows: new Map([
        ["window-1", { id: "window-1", edge: "top", order: 0 }],
        ["window-2", { id: "window-2", edge: "top", order: 1 }],
      ]),
      zOrder: ["window-1", "window-2"],
    };
    const result = activateWindowOnEdge(state, {
      type: "activateWindowOnEdge",
      edge: "top",
      id: "window-1",
    });
    expect(result.zOrder).toEqual(["window-2", "window-1"]);
  });

  test("returns the original state if no window can be found", () => {
    const state = initialDockingState;
    const result = activateWindowOnEdge(state, {
      type: "activateWindowOnEdge",
      edge: "top",
    });
    expect(result).toBe(state);
  });

  test("raises already-active window if it is not at top of z-order", () => {
    let state = initialDockingState;
    state = {
      ...state,
      dockedWindows: new Map([
        ["window-1", { id: "window-1", edge: "top", order: 0 }],
        ["window-2", { id: "window-2", edge: "top", order: 1 }],
      ]),
      activeWindowsByEdge: new Map([["top", "window-1"]]),
      zOrder: ["window-1", "window-2"],
    };
    const result = activateWindowOnEdge(state, {
      type: "activateWindowOnEdge",
      edge: "top",
    });
    expect(result.activeWindowsByEdge.get("top")).toBe("window-1");
    expect(result.zOrder).toEqual(["window-2", "window-1"]);
  });
});
