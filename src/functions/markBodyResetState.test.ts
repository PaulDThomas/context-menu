import {
  CONTEXT_WINDOW_RESET_COUNTER_DATA_ATTR,
  CONTEXT_WINDOW_RESET_SOURCE_DATA_ATTR,
} from "./contextWindowConstants";
import { markBodyResetState } from "./markBodyResetState";

describe("markBodyResetState", () => {
  afterEach(() => {
    document.body.removeAttribute(CONTEXT_WINDOW_RESET_COUNTER_DATA_ATTR);
    document.body.removeAttribute(CONTEXT_WINDOW_RESET_SOURCE_DATA_ATTR);
  });

  test("Starts the counter at 1 and increments it", () => {
    markBodyResetState();
    expect(document.body.getAttribute(CONTEXT_WINDOW_RESET_COUNTER_DATA_ATTR)).toBe("1");
    markBodyResetState();
    expect(document.body.getAttribute(CONTEXT_WINDOW_RESET_COUNTER_DATA_ATTR)).toBe("2");
  });

  test("Restarts the counter at 1 when the stored value is invalid", () => {
    document.body.setAttribute(CONTEXT_WINDOW_RESET_COUNTER_DATA_ATTR, "abc");
    markBodyResetState();
    expect(document.body.getAttribute(CONTEXT_WINDOW_RESET_COUNTER_DATA_ATTR)).toBe("1");
  });

  test("Records the source window, and clears it when there is none", () => {
    markBodyResetState("win-1");
    expect(document.body.getAttribute(CONTEXT_WINDOW_RESET_SOURCE_DATA_ATTR)).toBe("win-1");
    markBodyResetState();
    expect(document.body).not.toHaveAttribute(CONTEXT_WINDOW_RESET_SOURCE_DATA_ATTR);
  });
});
