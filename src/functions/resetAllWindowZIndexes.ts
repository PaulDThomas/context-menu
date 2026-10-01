import { CONTEXT_WINDOW_DATA_ATTR, CONTEXT_WINDOW_RESET_EVENT } from "./contextWindowConstants";
import { getWindowMinZIndex } from "./getWindowMinZIndex";
import { markBodyResetState } from "./markBodyResetState";

/** Drops every context window back to its own minimum z-index and notifies the windows */
export const resetAllWindowZIndexes = (
  fallbackMinZIndex: number,
  sourceWindowId?: string,
): void => {
  const windows = document.body.querySelectorAll(`[${CONTEXT_WINDOW_DATA_ATTR}]`);
  windows.forEach((win) => {
    const element = win as HTMLElement;
    element.style.zIndex = `${getWindowMinZIndex(element, fallbackMinZIndex)}`;
  });

  markBodyResetState(sourceWindowId);
  document.dispatchEvent(new Event(CONTEXT_WINDOW_RESET_EVENT));
};
