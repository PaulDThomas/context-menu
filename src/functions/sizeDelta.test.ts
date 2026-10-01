import { sizeDelta } from "./sizeDelta";

describe("sizeDelta", () => {
  test.each([
    ["left", 10, 20, 10],
    ["right", 10, 20, -10],
    ["top", 10, 20, 20],
    ["bottom", 10, 20, -20],
  ] as const)("%s edge with dx=%d dy=%d -> %d", (edge, dx, dy, expected) => {
    expect(sizeDelta(edge, dx, dy)).toBe(expected);
  });
});
