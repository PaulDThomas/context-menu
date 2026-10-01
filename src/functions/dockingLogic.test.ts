import {
  SNAP_HYSTERESIS,
  SNAP_THRESHOLD,
  UNDOCK_THRESHOLD,
  calculateUndockPosition,
  clampUndockPosition,
  detectSnapEdge,
  parseTranslate,
  shouldUndockFromEdge,
} from "./dockingLogic";

describe("dockingLogic", () => {
  describe("detectSnapEdge", () => {
    test("detects left edge when cursor is near left", () => {
      const result = detectSnapEdge(10, 100, null);
      expect(result).toBe("left");
    });

    test("detects right edge when cursor is near right", () => {
      const result = detectSnapEdge(window.innerWidth - 10, 100, null);
      expect(result).toBe("right");
    });

    test("detects top edge when cursor is near top", () => {
      const result = detectSnapEdge(100, 10, null);
      expect(result).toBe("top");
    });

    test("detects bottom edge when cursor is near bottom", () => {
      const result = detectSnapEdge(100, window.innerHeight - 10, null);
      expect(result).toBe("bottom");
    });

    test("returns null when cursor is far from edges", () => {
      const result = detectSnapEdge(500, 500, null);
      expect(result).toBeNull();
    });

    test("uses hysteresis when already snapped to maintain snap", () => {
      const result = detectSnapEdge(SNAP_HYSTERESIS - 1, 100, "left");
      expect(result).toBe("left");
    });

    test("loses snap when cursor moves beyond hysteresis threshold", () => {
      const result = detectSnapEdge(SNAP_HYSTERESIS + 1, 100, "left");
      expect(result).toBeNull();
    });

    test("requires tighter threshold to snap when not already snapped", () => {
      const result = detectSnapEdge(SNAP_THRESHOLD + 5, 100, null);
      expect(result).toBeNull();
    });
  });

  describe("shouldUndockFromEdge", () => {
    test("undocks from top edge when cursor moves down", () => {
      const result = shouldUndockFromEdge("top", 100, UNDOCK_THRESHOLD + 1);
      expect(result).toBe(true);
    });

    test("undocks from bottom edge when cursor moves up", () => {
      const result = shouldUndockFromEdge("bottom", 100, window.innerHeight - UNDOCK_THRESHOLD - 1);
      expect(result).toBe(true);
    });

    test("undocks from left edge when cursor moves right", () => {
      const result = shouldUndockFromEdge("left", UNDOCK_THRESHOLD + 1, 100);
      expect(result).toBe(true);
    });

    test("undocks from right edge when cursor moves left", () => {
      const result = shouldUndockFromEdge("right", window.innerWidth - UNDOCK_THRESHOLD - 1, 100);
      expect(result).toBe(true);
    });

    test("does not undock when cursor stays within threshold of top edge", () => {
      const result = shouldUndockFromEdge("top", 100, UNDOCK_THRESHOLD - 1);
      expect(result).toBe(false);
    });
  });

  describe("clampUndockPosition", () => {
    test("clamps left position when window extends past right edge", () => {
      const result = clampUndockPosition(window.innerWidth + 100, 100, 300, 200);
      expect(result.left).toBeLessThan(window.innerWidth);
    });

    test("clamps top position when window extends past bottom edge", () => {
      const result = clampUndockPosition(100, window.innerHeight + 100, 200, 300);
      expect(result.top).toBeLessThan(window.innerHeight);
    });

    test("respects innerBounce padding", () => {
      const result = clampUndockPosition(
        window.innerWidth + 100,
        window.innerHeight + 100,
        300,
        200,
      );
      expect(result.left).toBeGreaterThan(0);
      expect(result.top).toBeGreaterThan(0);
    });

    test("returns original position when already on-screen", () => {
      const result = clampUndockPosition(100, 100, 200, 200);
      expect(result.left).toBe(100);
      expect(result.top).toBe(100);
    });
  });

  describe("parseTranslate", () => {
    test("parses valid translate transform", () => {
      const result = parseTranslate("translate(100px, 200px)");
      expect(result).toEqual({ x: 100, y: 200 });
    });

    test("parses negative translate values", () => {
      const result = parseTranslate("translate(-50px, -75px)");
      expect(result).toEqual({ x: -50, y: -75 });
    });

    test("parses float translate values", () => {
      const result = parseTranslate("translate(123.45px, 67.89px)");
      expect(result.x).toBeCloseTo(123.45, 1);
      expect(result.y).toBeCloseTo(67.89, 1);
    });

    test("returns zero when transform is undefined", () => {
      const result = parseTranslate(undefined);
      expect(result).toEqual({ x: 0, y: 0 });
    });

    test("returns zero when transform is not a translate", () => {
      const result = parseTranslate("rotate(45deg)");
      expect(result).toEqual({ x: 0, y: 0 });
    });

    test("returns zero when transform is malformed", () => {
      const result = parseTranslate("translate(100px 200px)");
      expect(result).toEqual({ x: 0, y: 0 });
    });
  });

  describe("calculateUndockPosition", () => {
    test("calculates position for drag-undock from floating window", () => {
      const pointer = { x: 200, y: 300 };
      const savedRect = { x: 100, y: 100, width: 300, height: 200 };
      const result = calculateUndockPosition(false, pointer, savedRect);
      expect(result).toMatchObject({
        left: pointer.x,
        top: pointer.y,
        anchorToPointer: true,
      });
    });

    test("restores saved position for undock from docked window", () => {
      const savedRect = { x: 150, y: 200, width: 300, height: 250 };
      const result = calculateUndockPosition(true, undefined, savedRect);
      expect(result).toMatchObject({
        left: savedRect.x,
        top: savedRect.y,
        width: savedRect.width,
        height: savedRect.height,
      });
    });

    test("uses anchor element when no saved position", () => {
      const mockAnchor = {
        getBoundingClientRect: () => ({
          left: 50,
          bottom: 150,
          right: 350,
          top: 50,
          width: 300,
          height: 100,
          toJSON: () => ({}),
        }),
      } as Element;

      const result = calculateUndockPosition(true, undefined, null, mockAnchor);
      expect(result).toMatchObject({
        left: expect.any(Number),
        top: expect.any(Number),
      });
    });

    test("uses default values when anchor is null", () => {
      const result = calculateUndockPosition(true, undefined, null, null);
      expect(result).toMatchObject({
        left: expect.any(Number),
        top: expect.any(Number),
      });
    });
  });
});
