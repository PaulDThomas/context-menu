import { checkPosition } from "./checkPosition";

const mockRect = (left: number, right: number, top: number, bottom: number) => () =>
  ({
    left,
    right,
    top,
    bottom,
    width: right - left,
    height: bottom - top,
    x: left,
    y: top,
    toJSON: () => ({}),
  }) as DOMRect;

describe("checkPosition", () => {
  it("does nothing when the ref has no current element", () => {
    const move = vi.fn();

    expect(() => checkPosition({ current: null }, move)).not.toThrow();
    expect(move).toHaveBeenCalledWith(0, 0);
  });

  it("moves an element back inside the viewport", () => {
    const element = document.createElement("div");
    element.getBoundingClientRect = mockRect(-10, 10, -10, 10);
    const move = vi.fn();

    checkPosition({ current: element }, move);

    expect(move).toHaveBeenCalledWith(26, 26);
  });

  it("fits an oversized element to the viewport", () => {
    const element = document.createElement("div");
    const width = window.innerWidth + 100;
    const height = window.innerHeight + 100;
    Object.defineProperty(element, "clientWidth", { value: width - 20, configurable: true });
    Object.defineProperty(element, "clientHeight", { value: height - 30, configurable: true });
    element.getBoundingClientRect = mockRect(0, width, 0, height);

    checkPosition({ current: element }, vi.fn());

    expect(element.style.width).toBe(`${window.innerWidth - 32 - 20}px`);
    expect(element.style.height).toBe(`${window.innerHeight - 32 - 30}px`);
  });
});
