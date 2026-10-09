import { WINDOW_DATA_ATTRIBUTE, WINDOW_Z_INDEX_RESET_EVENT } from "./contextWindowConstants";
import { getBodyZIndexLimits } from "./getBodyZIndexLimits";
import { readLimit } from "./readLimit";

const RESET_COUNTER_ATTRIBUTE = "data-context-window-reset-counter";
const RESET_SOURCE_ATTRIBUTE = "data-context-window-reset-source";

export const raiseBodyWindow = (element: HTMLElement): number => {
  const { min, max } = getBodyZIndexLimits();
  const windows = Array.from(
    document.body.querySelectorAll<HTMLElement>(`[${WINDOW_DATA_ATTRIBUTE}]`),
  );
  const highestOther = (): number =>
    windows.reduce((highest, node) => {
      const index = Number.parseInt(node.style.zIndex, 10);
      return node !== element && Number.isFinite(index) ? Math.max(highest, index) : highest;
    }, min - 1);

  let highest = highestOther();
  const reset = highest >= max;
  if (reset) {
    for (const node of windows) {
      node.style.zIndex = `${min}`;
      node.setAttribute("data-context-window-min-z-index", `${min}`);
    }
    const counter = readLimit(document.body.getAttribute(RESET_COUNTER_ATTRIBUTE), 0);
    document.body.setAttribute(RESET_COUNTER_ATTRIBUTE, `${counter + 1}`);
    if (element.id) {
      document.body.setAttribute(RESET_SOURCE_ATTRIBUTE, element.id);
    } else {
      document.body.removeAttribute(RESET_SOURCE_ATTRIBUTE);
    }
    highest = highestOther();
  }

  const current = Number.parseInt(element.style.zIndex, 10);
  const next = reset || !Number.isFinite(current) || current <= highest ? highest + 1 : current;
  element.style.zIndex = `${next}`;
  element.setAttribute("data-context-window-min-z-index", `${min}`);
  if (reset) {
    document.dispatchEvent(new Event(WINDOW_Z_INDEX_RESET_EVENT));
  }
  return next;
};
