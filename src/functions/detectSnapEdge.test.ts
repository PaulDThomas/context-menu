import { SNAP_HYSTERESIS, SNAP_THRESHOLD, detectSnapEdge } from "./detectSnapEdge";

describe("detectSnapEdge", () => {
  test("detects left edge when cursor is near left", () => {
    const result = detectSnapEdge(10, 100, null);
    expect(result).toBe("left");
  });

  test("detects right edge when cursor is near right", () => {
    const result = detectSnapEdge(window.innerWidth - 10, 100, null);
    expect(result).toBe("right");
  });

  test("detects top edge when cursor is near top", () => {
    const result = detectSnapEdge(100, 10, null);
    expect(result).toBe("top");
  });

  test("detects bottom edge when cursor is near bottom", () => {
    const result = detectSnapEdge(100, window.innerHeight - 10, null);
    expect(result).toBe("bottom");
  });

  test("returns null when cursor is far from edges", () => {
    const result = detectSnapEdge(500, 500, null);
    expect(result).toBeNull();
  });

  test("uses hysteresis when already snapped to maintain snap", () => {
    const result = detectSnapEdge(SNAP_HYSTERESIS - 1, 100, "left");
    expect(result).toBe("left");
  });

  test("loses snap when cursor moves beyond hysteresis threshold", () => {
    const result = detectSnapEdge(SNAP_HYSTERESIS + 1, 100, "left");
    expect(result).toBeNull();
  });

  test("requires tighter threshold to snap when not already snapped", () => {
    const result = detectSnapEdge(SNAP_THRESHOLD + 5, 100, null);
    expect(result).toBeNull();
  });
});
