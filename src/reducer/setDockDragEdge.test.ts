import { setDockDragEdge } from "./setDockDragEdge";
import { initialDockingState } from "./types";

describe("setDockDragEdge", () => {
  test("sets the drag snap edge", () => {
    const state = initialDockingState;
    const result = setDockDragEdge(state, { type: "setDockDragEdge", edge: "top" });
    expect(result.dragSnapEdge).toBe("top");
  });

  test("clears the drag snap edge when set to null", () => {
    let state = initialDockingState;
    state = { ...state, dragSnapEdge: "top" };
    const result = setDockDragEdge(state, { type: "setDockDragEdge", edge: null });
    expect(result.dragSnapEdge).toBeNull();
  });

  test("returns the original state if the edge hasn't changed", () => {
    let state = initialDockingState;
    state = { ...state, dragSnapEdge: "top" };
    const result = setDockDragEdge(state, { type: "setDockDragEdge", edge: "top" });
    expect(result).toBe(state);
  });

  test("transitions between different edges", () => {
    let state = initialDockingState;
    state = { ...state, dragSnapEdge: "top" };
    const result = setDockDragEdge(state, { type: "setDockDragEdge", edge: "bottom" });
    expect(result.dragSnapEdge).toBe("bottom");
  });
});
