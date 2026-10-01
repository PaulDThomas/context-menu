import { CONTEXT_WINDOW_MIN_Z_INDEX_DATA_ATTR } from "./contextWindowConstants";

/** A window's own minimum z-index from its data attribute, or the fallback when absent/invalid */
export const getWindowMinZIndex = (
  windowElement: HTMLElement,
  fallbackMinZIndex: number,
): number => {
  const minZIndexAttr = windowElement.getAttribute(CONTEXT_WINDOW_MIN_Z_INDEX_DATA_ATTR);
  const parsedMinZIndex = minZIndexAttr ? parseInt(minZIndexAttr, 10) : NaN;
  return Number.isNaN(parsedMinZIndex) ? fallbackMinZIndex : parsedMinZIndex;
};
