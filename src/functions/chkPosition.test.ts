import { chkPosition } from "./chkPosition";

const mockGbc = (left: number, right: number, top: number, bottom: number) => () => ({
  left,
  right,
  top,
  bottom,
  height: bottom - top,
  width: right - left,
  x: left,
  y: top,
  toJSON: () => ({}),
});

describe("chkPosition", () => {
  // Mock the window object
  beforeAll(() => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, "innerHeight", {
      writable: true,
      configurable: true,
      value: 768,
    });
  });

  it("should return { translateX: 0, translateY: 0 } when divRef.current is null", () => {
    expect(chkPosition({ current: null })).toEqual({ translateX: 0, translateY: 0 });
  });

  it("should return correct translation when div is outside the viewport on the left", () => {
    const divRef = {
      current: {
        ...document.createElement("div"),
        getBoundingClientRect: mockGbc(-10, 10, 10, 20),
      },
    };
    expect(chkPosition(divRef)).toEqual({ translateX: 26, translateY: 6 });
  });

  it("should return correct translation when div is outside the viewport on the right", () => {
    const divRef = {
      current: {
        ...document.createElement("div"),
        getBoundingClientRect: mockGbc(1010, 1030, 10, 20),
      },
    };
    expect(chkPosition(divRef)).toEqual({ translateX: -22, translateY: 6 });
  });

  it("should return correct translation when div is outside the viewport on the top", () => {
    const divRef = {
      current: {
        ...document.createElement("div"),
        getBoundingClientRect: mockGbc(10, 20, -10, 10),
      },
    };
    expect(chkPosition(divRef)).toEqual({ translateX: 6, translateY: 26 });
  });

  it("should return correct translation when div is outside the viewport on the bottom", () => {
    const divRef = {
      current: {
        ...document.createElement("div"),

        getBoundingClientRect: mockGbc(10, 20, 750, 770),
      },
    };
    expect(chkPosition(divRef)).toEqual({ translateX: 6, translateY: -18 });
  });
});
