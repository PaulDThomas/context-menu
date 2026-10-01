import {
  CONTEXT_WINDOW_RESET_COUNTER_DATA_ATTR,
  CONTEXT_WINDOW_RESET_SOURCE_DATA_ATTR,
} from "./contextWindowConstants";

/** Bumps the body's reset counter and records which window (if any) triggered the reset */
export const markBodyResetState = (sourceWindowId?: string): void => {
  const currentCounter = parseInt(
    document.body.getAttribute(CONTEXT_WINDOW_RESET_COUNTER_DATA_ATTR) ?? "0",
    10,
  );
  const nextCounter = Number.isNaN(currentCounter) ? 1 : currentCounter + 1;
  document.body.setAttribute(CONTEXT_WINDOW_RESET_COUNTER_DATA_ATTR, `${nextCounter}`);

  if (sourceWindowId) {
    document.body.setAttribute(CONTEXT_WINDOW_RESET_SOURCE_DATA_ATTR, sourceWindowId);
    return;
  }

  document.body.removeAttribute(CONTEXT_WINDOW_RESET_SOURCE_DATA_ATTR);
};
