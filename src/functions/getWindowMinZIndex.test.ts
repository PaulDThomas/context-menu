import { CONTEXT_WINDOW_MIN_Z_INDEX_DATA_ATTR } from "./contextWindowConstants";
import { getWindowMinZIndex } from "./getWindowMinZIndex";

describe("getWindowMinZIndex", () => {
  test("Reads the minimum z-index attribute", () => {
    const el = document.createElement("div");
    el.setAttribute(CONTEXT_WINDOW_MIN_Z_INDEX_DATA_ATTR, "4000");
    expect(getWindowMinZIndex(el, 3000)).toBe(4000);
  });

  test("Falls back when the attribute is missing", () => {
    expect(getWindowMinZIndex(document.createElement("div"), 3000)).toBe(3000);
  });

  test.each(["", "abc"])("Falls back when the attribute is %j", (value) => {
    const el = document.createElement("div");
    el.setAttribute(CONTEXT_WINDOW_MIN_Z_INDEX_DATA_ATTR, value);
    expect(getWindowMinZIndex(el, 3000)).toBe(3000);
  });
});
