export function parseTranslate(transform?: string): { x: number; y: number } {
  const match = transform?.match(/translate\((-?\d+(?:\.\d+)?)px,\s*(-?\d+(?:\.\d+)?)px\)/);
  if (match) {
    return {
      x: Number.parseFloat(match[1]),
      y: Number.parseFloat(match[2]),
    };
  }
  return { x: 0, y: 0 };
}
