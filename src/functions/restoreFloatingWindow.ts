import type { PendingFloatingStyle } from "../components/interface";

export const restoreFloatingWindow = (
  element: HTMLDivElement,
  pending: PendingFloatingStyle,
  pointer: { x: number; y: number },
): void => {
  let { left, top } = pending;
  if (pending.anchorToPointer) {
    const width = pending.width ?? 200;
    left = Math.max(0, pointer.x - width / 2) + window.scrollX;
    top = Math.max(0, pointer.y - 14) + window.scrollY;
  } else if (pending.centerInViewport) {
    left = Math.max(16, (window.innerWidth - element.offsetWidth) / 2) + window.scrollX;
    top = Math.max(16, (window.innerHeight - element.offsetHeight) / 2) + window.scrollY;
  } else {
    const padding = 16;
    const width = pending.width ?? element.offsetWidth;
    const height = pending.height ?? element.offsetHeight;
    const viewLeft = left - window.scrollX;
    const viewTop = top - window.scrollY;
    if (viewLeft + width > window.innerWidth) {
      left = Math.max(padding, window.innerWidth - width - padding) + window.scrollX;
    }
    if (viewTop + height > window.innerHeight) {
      top = Math.max(padding, window.innerHeight - height - padding) + window.scrollY;
    }
  }
  element.style.left = `${left}px`;
  element.style.top = `${top}px`;
  element.style.transform = "";
  if (pending.width !== undefined) element.style.width = `${pending.width}px`;
  if (pending.height !== undefined) element.style.height = `${pending.height}px`;
};
