import { startDockDrag } from "./startDockDrag";
import { initialDockingState } from "./types";

describe("startDockDrag", () => {
  test("sets the dragged window id", () => {
    const state = initialDockingState;
    const result = startDockDrag(state, { type: "startDockDrag", id: "window-1" });
    expect(result.dragWindowId).toBe("window-1");
  });

  test("clears the drag snap edge", () => {
    let state = initialDockingState;
    state = { ...state, dragSnapEdge: "top" };
    const result = startDockDrag(state, { type: "startDockDrag", id: "window-1" });
    expect(result.dragSnapEdge).toBeNull();
  });

  test("replaces any previously dragging window", () => {
    let state = initialDockingState;
    state = { ...state, dragWindowId: "window-1", dragSnapEdge: "top" };
    const result = startDockDrag(state, { type: "startDockDrag", id: "window-2" });
    expect(result.dragWindowId).toBe("window-2");
    expect(result.dragSnapEdge).toBeNull();
  });
});
