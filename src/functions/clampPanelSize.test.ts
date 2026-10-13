import { clampPanelSize } from "./clampPanelSize";
import { DOCK_PANEL_MIN_SIZE, DOCK_PANEL_VIEWPORT_GAP } from "./dockPanelConstants";

describe("clampPanelSize", () => {
  const originalWidth = window.innerWidth;
  const originalHeight = window.innerHeight;

  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 1000,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      writable: true,
      value: 600,
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

  test("Keeps sizes within range, rounded", () => {
    expect(clampPanelSize("left", 250.6)).toBe(251);
    expect(clampPanelSize("top", 300)).toBe(300);
  });

  test("Raises sizes below the minimum", () => {
    expect(clampPanelSize("right", 10)).toBe(DOCK_PANEL_MIN_SIZE);
    expect(clampPanelSize("bottom", -50)).toBe(DOCK_PANEL_MIN_SIZE);
  });

  test("Limits left/right panels by viewport width", () => {
    expect(clampPanelSize("left", 5000)).toBe(1000 - DOCK_PANEL_VIEWPORT_GAP);
    expect(clampPanelSize("right", 5000)).toBe(1000 - DOCK_PANEL_VIEWPORT_GAP);
  });

  test("Limits top/bottom panels by viewport height", () => {
    expect(clampPanelSize("top", 5000)).toBe(600 - DOCK_PANEL_VIEWPORT_GAP);
    expect(clampPanelSize("bottom", 5000)).toBe(600 - DOCK_PANEL_VIEWPORT_GAP);
  });

  test("Never goes below the minimum in a tiny viewport", () => {
    window.innerWidth = 50;
    expect(clampPanelSize("left", 5000)).toBe(DOCK_PANEL_MIN_SIZE);
  });
});
