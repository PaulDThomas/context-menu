import { distanceToRect } from "./distanceToRect";

describe("distanceToRect", () => {
  const rect = { left: 100, right: 200, top: 50, bottom: 150 } as DOMRect;

  test("Is zero inside or on the edge", () => {
    expect(distanceToRect(rect, 150, 100)).toBe(0);
    expect(distanceToRect(rect, 100, 50)).toBe(0);
    expect(distanceToRect(rect, 200, 150)).toBe(0);
  });

  test.each([
    [40, 100, 60],
    [260, 100, 60],
    [150, 10, 40],
    [150, 190, 40],
  ])("Straight-line distance from (%d, %d) is %d", (x, y, expected) => {
    expect(distanceToRect(rect, x, y)).toBe(expected);
  });

  test("Uses the corner distance diagonally", () => {
    expect(distanceToRect(rect, 70, 10)).toBe(50);
    expect(distanceToRect(rect, 230, 190)).toBe(50);
  });
});
