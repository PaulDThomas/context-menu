import { parseTranslate } from "./parseTranslate";

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
