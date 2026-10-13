import { clampUndockPosition } from "./clampUndockPosition";

describe("clampUndockPosition", () => {
  test("clamps left position when window extends past right edge", () => {
    const result = clampUndockPosition(window.innerWidth + 100, 100, 300, 200);
    expect(result.left).toBeLessThan(window.innerWidth);
  });

  test("clamps top position when window extends past bottom edge", () => {
    const result = clampUndockPosition(100, window.innerHeight + 100, 200, 300);
    expect(result.top).toBeLessThan(window.innerHeight);
  });

  test("respects innerBounce padding", () => {
    const result = clampUndockPosition(window.innerWidth + 100, window.innerHeight + 100, 300, 200);
    expect(result.left).toBeGreaterThan(0);
    expect(result.top).toBeGreaterThan(0);
  });

  test("returns original position when already on-screen", () => {
    const result = clampUndockPosition(100, 100, 200, 200);
    expect(result.left).toBe(100);
    expect(result.top).toBe(100);
  });
});
