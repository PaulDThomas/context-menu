/** Distance from a point to the nearest part of a rectangle (0 when inside) */
export const distanceToRect = (rect: DOMRect, x: number, y: number): number => {
  const dx = Math.max(rect.left - x, 0, x - rect.right);
  const dy = Math.max(rect.top - y, 0, y - rect.bottom);
  return Math.hypot(dx, dy);
};
