import { isHorizontalEdge } from "./isHorizontalEdge";

describe("isHorizontalEdge", () => {
  test.each([
    ["left", true],
    ["right", true],
    ["top", false],
    ["bottom", false],
  ] as const)("%s -> %s", (edge, expected) => {
    expect(isHorizontalEdge(edge)).toBe(expected);
  });
});
