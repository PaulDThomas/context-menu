import { CONTEXT_WINDOW_DATA_ATTR } from "./contextWindowConstants";
import { getMaxZIndex } from "./getMaxZIndex";

const addWindow = (zIndex?: string): HTMLElement => {
  const el = document.createElement("div");
  el.setAttribute(CONTEXT_WINDOW_DATA_ATTR, "");
  if (zIndex !== undefined) el.style.zIndex = zIndex;
  document.body.appendChild(el);
  return el;
};

describe("getMaxZIndex", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  test("Returns one below the minimum when there are no windows", () => {
    expect(getMaxZIndex(3000)).toBe(2999);
  });

  test("Returns the highest z-index among context windows", () => {
    addWindow("3002");
    addWindow("3005");
    addWindow("3001");
    expect(getMaxZIndex(3000)).toBe(3005);
  });

  test("Ignores the current window", () => {
    addWindow("3002");
    const current = addWindow("3005");
    expect(getMaxZIndex(3000, current)).toBe(3002);
  });

  test("Ignores windows without a usable z-index or below the minimum", () => {
    addWindow();
    addWindow("auto");
    addWindow("10");
    expect(getMaxZIndex(3000)).toBe(2999);
  });

  test("Ignores elements that are not context windows", () => {
    const other = document.createElement("div");
    other.style.zIndex = "9999";
    document.body.appendChild(other);
    expect(getMaxZIndex(3000)).toBe(2999);
  });
});
