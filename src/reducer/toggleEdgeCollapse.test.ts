import { toggleEdgeCollapse } from "./toggleEdgeCollapse";
import { initialDockingState } from "./types";

describe("toggleEdgeCollapse", () => {
  test("adds an edge to collapsedEdges if not present", () => {
    const state = initialDockingState;
    const result = toggleEdgeCollapse(state, { type: "toggleEdgeCollapse", edge: "top" });
    expect(result.collapsedEdges.has("top")).toBe(true);
  });

  test("removes an edge from collapsedEdges if already present", () => {
    let state = initialDockingState;
    state = { ...state, collapsedEdges: new Set(["top"]) };
    const result = toggleEdgeCollapse(state, { type: "toggleEdgeCollapse", edge: "top" });
    expect(result.collapsedEdges.has("top")).toBe(false);
  });

  test("preserves other edges in collapsedEdges", () => {
    let state = initialDockingState;
    state = { ...state, collapsedEdges: new Set(["top", "bottom"]) };
    const result = toggleEdgeCollapse(state, { type: "toggleEdgeCollapse", edge: "top" });
    expect(result.collapsedEdges.has("top")).toBe(false);
    expect(result.collapsedEdges.has("bottom")).toBe(true);
  });

  test("returns a new Set, not modifying the original", () => {
    let state = initialDockingState;
    state = { ...state, collapsedEdges: new Set(["top"]) };
    const result = toggleEdgeCollapse(state, { type: "toggleEdgeCollapse", edge: "top" });
    expect(state.collapsedEdges.has("top")).toBe(true);
    expect(result.collapsedEdges.has("top")).toBe(false);
  });
});
