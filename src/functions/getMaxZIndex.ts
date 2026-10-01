import { CONTEXT_WINDOW_DATA_ATTR } from "./contextWindowConstants";

/** Highest z-index among the context windows in the DOM, ignoring `currentWindow` */
export const getMaxZIndex = (
  componentMinZIndex: number,
  currentWindow?: HTMLElement | null,
): number => {
  const windows = document.body.querySelectorAll(`[${CONTEXT_WINDOW_DATA_ATTR}]`);
  let maxZIndex = componentMinZIndex - 1;
  windows.forEach((win) => {
    if (currentWindow && win === currentWindow) {
      return;
    }
    const zIndexStr = (win as HTMLElement).style.zIndex;
    if (zIndexStr) {
      const zIndex = parseInt(zIndexStr, 10);
      if (!isNaN(zIndex) && zIndex > maxZIndex) {
        maxZIndex = zIndex;
      }
    }
  });
  return maxZIndex;
};
