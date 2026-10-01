import {
  CONTEXT_WINDOW_DATA_ATTR,
  CONTEXT_WINDOW_MIN_Z_INDEX_DATA_ATTR,
  CONTEXT_WINDOW_RESET_COUNTER_DATA_ATTR,
  CONTEXT_WINDOW_RESET_EVENT,
  CONTEXT_WINDOW_RESET_SOURCE_DATA_ATTR,
} from "./contextWindowConstants";
import { resetAllWindowZIndexes } from "./resetAllWindowZIndexes";

describe("resetAllWindowZIndexes", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    document.body.removeAttribute(CONTEXT_WINDOW_RESET_COUNTER_DATA_ATTR);
    document.body.removeAttribute(CONTEXT_WINDOW_RESET_SOURCE_DATA_ATTR);
  });

  test("Resets each window to its own minimum, or the fallback", () => {
    const own = document.createElement("div");
    own.setAttribute(CONTEXT_WINDOW_DATA_ATTR, "");
    own.setAttribute(CONTEXT_WINDOW_MIN_Z_INDEX_DATA_ATTR, "5000");
    own.style.zIndex = "5009";
    const fallback = document.createElement("div");
    fallback.setAttribute(CONTEXT_WINDOW_DATA_ATTR, "");
    fallback.style.zIndex = "3008";
    const other = document.createElement("div");
    other.style.zIndex = "77";
    document.body.append(own, fallback, other);

    resetAllWindowZIndexes(3000);

    expect(own.style.zIndex).toBe("5000");
    expect(fallback.style.zIndex).toBe("3000");
    expect(other.style.zIndex).toBe("77");
  });

  test("Marks the body reset state and dispatches the reset event", () => {
    const listener = jest.fn();
    document.addEventListener(CONTEXT_WINDOW_RESET_EVENT, listener);

    resetAllWindowZIndexes(3000, "win-1");

    expect(document.body.getAttribute(CONTEXT_WINDOW_RESET_COUNTER_DATA_ATTR)).toBe("1");
    expect(document.body.getAttribute(CONTEXT_WINDOW_RESET_SOURCE_DATA_ATTR)).toBe("win-1");
    expect(listener).toHaveBeenCalledTimes(1);
    document.removeEventListener(CONTEXT_WINDOW_RESET_EVENT, listener);
  });
});
