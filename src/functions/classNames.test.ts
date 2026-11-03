import { classNames } from "./classNames";

describe("classNames", () => {
  test("joins truthy names and skips empty or falsy ones", () => {
    expect(classNames("a", "", false, null, undefined, "b")).toBe("a b");
  });

  test("returns an empty string when nothing is set", () => {
    expect(classNames()).toBe("");
    expect(classNames("", false)).toBe("");
  });
});
