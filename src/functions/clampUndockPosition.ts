export function clampUndockPosition(
  left: number,
  top: number,
  width: number,
  height: number,
): { left: number; top: number } {
  const innerBounce = 16;
  const viewLeft = left - window.scrollX;
  const viewTop = top - window.scrollY;

  let clampedLeft = left;
  let clampedTop = top;

  if (viewLeft + width > window.innerWidth) {
    clampedLeft = Math.max(innerBounce, window.innerWidth - width - innerBounce) + window.scrollX;
  }

  if (viewTop + height > window.innerHeight) {
    clampedTop = Math.max(innerBounce, window.innerHeight - height - innerBounce) + window.scrollY;
  }

  return { left: clampedLeft, top: clampedTop };
}
