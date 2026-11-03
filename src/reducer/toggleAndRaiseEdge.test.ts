import { toggleAndRaiseEdge } from "./toggleAndRaiseEdge";
import { initialDockingState } from "./types";

describe("toggleAndRaiseEdge", () => {
  test("toggles the collapsed state and raises the active window", () => {
    let state = initialDockingState;
    state = {
      ...state,
      dockedWindows: new Map([["window-1", { id: "window-1", edge: "top", order: 0 }]]),
      activeWindowsByEdge: new Map([["top", "window-1"]]),
      zOrder: ["window-1", "window-2"],
    };
    const result = toggleAndRaiseEdge(state, { type: "toggleAndRaiseEdge", edge: "top" });
    expect(result.collapsedEdges.has("top")).toBe(true);
    expect(result.zOrder[result.zOrder.length - 1]).toBe("window-1");
  });

  test("finds the first window on an edge if no active window exists", () => {
    let state = initialDockingState;
    state = {
      ...state,
      dockedWindows: new Map([["window-1", { id: "window-1", edge: "top", order: 0 }]]),
      zOrder: ["window-1", "window-2"],
    };
    const result = toggleAndRaiseEdge(state, { type: "toggleAndRaiseEdge", edge: "top" });
    expect(result.collapsedEdges.has("top")).toBe(true);
    expect(result.zOrder[result.zOrder.length - 1]).toBe("window-1");
  });

  test("does not raise any window if the edge has no windows", () => {
    let state = initialDockingState;
    state = {
      ...state,
      zOrder: ["window-1", "window-2"],
    };
    const result = toggleAndRaiseEdge(state, { type: "toggleAndRaiseEdge", edge: "top" });
    expect(result.collapsedEdges.has("top")).toBe(true);
    expect(result.zOrder).toBe(state.zOrder);
  });

  test("returns the original zOrder if the window is already at the top", () => {
    let state = initialDockingState;
    state = {
      ...state,
      dockedWindows: new Map([["window-1", { id: "window-1", edge: "top", order: 0 }]]),
      activeWindowsByEdge: new Map([["top", "window-1"]]),
      zOrder: ["window-2", "window-1"],
    };
    const result = toggleAndRaiseEdge(state, { type: "toggleAndRaiseEdge", edge: "top" });
    expect(result.zOrder).toBe(state.zOrder);
  });
});
