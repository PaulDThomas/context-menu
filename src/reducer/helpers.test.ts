import { raise, withoutEdge } from "./helpers";

describe("raise", () => {
  test("moves an item to the end of the array", () => {
    expect(raise(["a", "b", "c"], "a")).toEqual(["b", "c", "a"]);
  });

  test("keeps an item already at the end", () => {
    const array = ["a", "b", "c"];
    expect(raise(array, "c")).toBe(array);
  });

  test("returns the original array if the item is not found", () => {
    const array = ["a", "b", "c"];
    expect(raise(array, "d")).toBe(array);
  });

  test("handles single-item arrays", () => {
    const array = ["a"];
    expect(raise(array, "a")).toBe(array);
  });
});

describe("withoutEdge", () => {
  test("removes an edge from the set", () => {
    const edges = new Set(["top", "bottom", "left"] as const);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = withoutEdge(edges as any, "top");
    expect(result.has("top")).toBe(false);
    expect(result.has("bottom")).toBe(true);
    expect(result.has("left")).toBe(true);
  });

  test("returns the original set if the edge is not present", () => {
    const edges = new Set(["top", "bottom"] as const);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(withoutEdge(edges as any, "left")).toBe(edges);
  });

  test("returns a new set, not modifying the original", () => {
    const edges = new Set(["top", "bottom"] as const);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = withoutEdge(edges as any, "top");
    expect(edges.has("top")).toBe(true);
    expect(result.has("top")).toBe(false);
  });
});
