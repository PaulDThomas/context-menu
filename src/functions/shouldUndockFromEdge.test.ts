import { UNDOCK_THRESHOLD, shouldUndockFromEdge } from "./shouldUndockFromEdge";

describe("shouldUndockFromEdge", () => {
  test("undocks from top edge when cursor moves down", () => {
    const result = shouldUndockFromEdge("top", 100, UNDOCK_THRESHOLD + 1);
    expect(result).toBe(true);
  });

  test("undocks from bottom edge when cursor moves up", () => {
    const result = shouldUndockFromEdge("bottom", 100, window.innerHeight - UNDOCK_THRESHOLD - 1);
    expect(result).toBe(true);
  });

  test("undocks from left edge when cursor moves right", () => {
    const result = shouldUndockFromEdge("left", UNDOCK_THRESHOLD + 1, 100);
    expect(result).toBe(true);
  });

  test("undocks from right edge when cursor moves left", () => {
    const result = shouldUndockFromEdge("right", window.innerWidth - UNDOCK_THRESHOLD - 1, 100);
    expect(result).toBe(true);
  });

  test("does not undock when cursor stays within threshold of top edge", () => {
    const result = shouldUndockFromEdge("top", 100, UNDOCK_THRESHOLD - 1);
    expect(result).toBe(false);
  });
});
