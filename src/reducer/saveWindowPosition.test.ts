import { saveWindowPosition } from "./saveWindowPosition";
import { initialDockingState } from "./types";

describe("saveWindowPosition", () => {
  const rect = { x: 10, y: 20, width: 300, height: 200 };

  test("stores the rect without mutating the previous state", () => {
    const result = saveWindowPosition(initialDockingState, {
      type: "saveWindowPosition",
      id: "window-1",
      rect,
    });
    expect(result).not.toBe(initialDockingState);
    expect(result.preDockRects.get("window-1")).toEqual(rect);
    expect(initialDockingState.preDockRects.has("window-1")).toBe(false);
  });

  test("replaces an existing saved rect", () => {
    const state = saveWindowPosition(initialDockingState, {
      type: "saveWindowPosition",
      id: "window-1",
      rect,
    });
    const result = saveWindowPosition(state, {
      type: "saveWindowPosition",
      id: "window-1",
      rect: { ...rect, x: 50 },
    });
    expect(result.preDockRects.get("window-1")?.x).toBe(50);
    expect(state.preDockRects.get("window-1")?.x).toBe(10);
  });
});
