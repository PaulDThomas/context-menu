import { fitToViewport } from "./fitToViewport";

describe("fitToViewport", () => {
  test("returns without throwing when element is null", () => {
    expect(() => fitToViewport(null)).not.toThrow();
  });

  test("sets width when element is wider than available viewport", () => {
    const element = document.createElement("div");
    const rectWidth = window.innerWidth + 100;
    Object.defineProperty(element, "clientWidth", { value: rectWidth - 40, configurable: true });
    Object.defineProperty(element, "clientHeight", { value: 200, configurable: true });
    element.getBoundingClientRect = vi.fn(() => ({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: rectWidth,
      bottom: 220,
      width: rectWidth,
      height: 220,
      toJSON: () => ({}),
    }));

    fitToViewport(element, 32);

    expect(element.style.width).toBe(`${window.innerWidth - 32 - 40}px`);
  });

  test("sets height when element is taller than available viewport", () => {
    const element = document.createElement("div");
    const rectHeight = window.innerHeight + 100;
    Object.defineProperty(element, "clientWidth", { value: 320, configurable: true });
    Object.defineProperty(element, "clientHeight", { value: rectHeight - 80, configurable: true });
    element.getBoundingClientRect = vi.fn(() => ({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 340,
      bottom: rectHeight,
      width: 340,
      height: rectHeight,
      toJSON: () => ({}),
    }));

    fitToViewport(element, 32);

    expect(element.style.height).toBe(`${window.innerHeight - 32 - 80}px`);
  });

  test("does not modify size when element already fits viewport", () => {
    const element = document.createElement("div");
    Object.defineProperty(element, "clientWidth", { value: 200, configurable: true });
    Object.defineProperty(element, "clientHeight", { value: 160, configurable: true });
    element.getBoundingClientRect = vi.fn(() => ({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 220,
      bottom: 180,
      width: 220,
      height: 180,
      toJSON: () => ({}),
    }));

    fitToViewport(element, 32);

    expect(element.style.width).toBe("");
    expect(element.style.height).toBe("");
  });
});
