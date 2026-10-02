import { calculateUndockPosition } from "./calculateUndockPosition";

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
