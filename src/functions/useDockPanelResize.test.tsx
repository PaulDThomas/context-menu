import { act, fireEvent, renderHook } from "@testing-library/react";
import type { DockEdge } from "../components/interface";
import { DOCK_PANEL_MIN_SIZE } from "./dockPanelConstants";
import { useDockPanelResize } from "./useDockPanelResize";

describe("useDockPanelResize", () => {
  const originalWidth = window.innerWidth;
  const originalHeight = window.innerHeight;

  beforeAll(() => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 1000,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      writable: true,
      value: 800,
    });
  });

  afterAll(() => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: originalWidth,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      writable: true,
      value: originalHeight,
    });
  });

  afterEach(() => {
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  });

  const makeRef = (width = 200, height = 150) => {
    const element = document.createElement("div");
    element.getBoundingClientRect = () => ({ width, height }) as DOMRect;
    return { current: element };
  };

  const setup = (edge: DockEdge, ref = makeRef()) => {
    const onResizeStart = jest.fn();
    const hook = renderHook(() => useDockPanelResize(edge, ref, onResizeStart));
    return { ...hook, onResizeStart };
  };

  const mouseDown = (overrides: Partial<React.MouseEvent<HTMLElement>> = {}) =>
    ({
      button: 0,
      clientX: 100,
      clientY: 100,
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
      ...overrides,
    }) as unknown as React.MouseEvent<HTMLElement>;

  const keyDown = (key: string, shiftKey = false) =>
    ({ key, shiftKey, preventDefault: jest.fn() }) as unknown as React.KeyboardEvent<HTMLElement>;

  test("Starts with no chosen size and not resizing", () => {
    const { result } = setup("left");
    expect(result.current.panelSize).toBeNull();
    expect(result.current.isResizing).toBe(false);
  });

  test("Ignores non-primary mouse buttons", () => {
    const { result, onResizeStart } = setup("left");
    const e = mouseDown({ button: 2 });
    act(() => result.current.handleResizeMouseDown(e));
    expect(e.preventDefault).not.toHaveBeenCalled();
    expect(onResizeStart).not.toHaveBeenCalled();
    expect(result.current.isResizing).toBe(false);
  });

  test.each([
    ["left", 150, 100, 250, "col-resize"],
    ["right", 150, 100, 150, "col-resize"],
    ["top", 100, 150, 200, "row-resize"],
    ["bottom", 100, 150, 100, "row-resize"],
  ] as const)("Dragging the %s edge to (%d, %d) resizes to %d", (edge, x, y, expected, cursor) => {
    const { result, onResizeStart } = setup(edge, makeRef(200, 150));
    const e = mouseDown();
    act(() => result.current.handleResizeMouseDown(e));
    expect(e.preventDefault).toHaveBeenCalled();
    expect(e.stopPropagation).toHaveBeenCalled();
    expect(onResizeStart).toHaveBeenCalledTimes(1);
    expect(result.current.isResizing).toBe(true);
    expect(document.body.style.cursor).toBe(cursor);
    expect(document.body.style.userSelect).toBe("none");

    act(() => {
      fireEvent.mouseMove(document, { clientX: x, clientY: y });
    });
    expect(result.current.panelSize).toBe(expected);
  });

  test("Mouse up ends the resize, restores body styles and stops tracking", () => {
    document.body.style.cursor = "pointer";
    const { result } = setup("left");
    act(() => result.current.handleResizeMouseDown(mouseDown()));
    act(() => {
      fireEvent.mouseUp(document);
    });
    expect(result.current.isResizing).toBe(false);
    expect(document.body.style.cursor).toBe("pointer");
    expect(document.body.style.userSelect).toBe("");

    act(() => {
      fireEvent.mouseMove(document, { clientX: 500, clientY: 100 });
    });
    expect(result.current.panelSize).toBeNull();
  });

  test("Dragged sizes are clamped", () => {
    const { result } = setup("left");
    act(() => result.current.handleResizeMouseDown(mouseDown()));
    act(() => {
      fireEvent.mouseMove(document, { clientX: -1000, clientY: 100 });
    });
    expect(result.current.panelSize).toBe(DOCK_PANEL_MIN_SIZE);
  });

  test("Unmounting mid-resize removes the document listeners", () => {
    const { result, unmount } = setup("left");
    act(() => result.current.handleResizeMouseDown(mouseDown()));
    const removeSpy = jest.spyOn(document, "removeEventListener");
    unmount();
    expect(removeSpy).toHaveBeenCalledWith("mousemove", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("mouseup", expect.any(Function));
    expect(document.body.style.cursor).toBe("");
    removeSpy.mockRestore();
  });

  test.each([
    ["left", "ArrowRight", false, 210],
    ["left", "ArrowLeft", false, 190],
    ["right", "ArrowLeft", false, 210],
    ["right", "ArrowRight", true, 150],
    ["top", "ArrowDown", false, 160],
    ["top", "ArrowUp", true, 100],
    ["bottom", "ArrowUp", false, 160],
    ["bottom", "ArrowDown", false, 140],
  ] as const)("%s edge: %s (shift=%s) resizes to %d", (edge, key, shift, expected) => {
    const { result, onResizeStart } = setup(edge, makeRef(200, 150));
    const e = keyDown(key, shift);
    act(() => result.current.handleResizeKeyDown(e));
    expect(e.preventDefault).toHaveBeenCalled();
    expect(onResizeStart).toHaveBeenCalledTimes(1);
    expect(result.current.panelSize).toBe(expected);
  });

  test.each([
    ["left", "ArrowUp"],
    ["left", "Enter"],
    ["top", "ArrowRight"],
  ] as const)("%s edge ignores %s", (edge, key) => {
    const { result, onResizeStart } = setup(edge);
    const e = keyDown(key);
    act(() => result.current.handleResizeKeyDown(e));
    expect(e.preventDefault).not.toHaveBeenCalled();
    expect(onResizeStart).not.toHaveBeenCalled();
    expect(result.current.panelSize).toBeNull();
  });
});
