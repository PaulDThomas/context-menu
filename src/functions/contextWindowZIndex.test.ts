import { WINDOW_DATA_ATTRIBUTE } from "./contextWindowConstants";
import { getBodyZIndexLimits } from "./getBodyZIndexLimits";
import { raiseBodyWindow } from "./raiseBodyWindow";

describe("body window stacking", () => {
  const nodes: HTMLElement[] = [];
  const makeWindow = (index: number, standalone = true): HTMLElement => {
    const node = document.createElement("div");
    if (standalone) node.setAttribute(WINDOW_DATA_ATTRIBUTE, "true");
    node.style.zIndex = `${index}`;
    document.body.appendChild(node);
    nodes.push(node);
    return node;
  };

  afterEach(() => {
    nodes.splice(0).forEach((node) => node.remove());
    [
      "data-acm-min-z-index",
      "data-acm-max-z-index",
      "data-context-window-reset-counter",
      "data-context-window-reset-source",
    ].forEach((attribute) => document.body.removeAttribute(attribute));
  });

  test("defaults to 3000-3100 and ignores malformed limits", () => {
    expect(getBodyZIndexLimits()).toEqual({ min: 3000, max: 3100 });
    document.body.setAttribute("data-acm-min-z-index", "3000px");
    document.body.setAttribute("data-acm-max-z-index", "Infinity");
    expect(getBodyZIndexLimits()).toEqual({ min: 3000, max: 3100 });
  });

  test("raises synchronously and leaves an already-top window unchanged", () => {
    const first = makeWindow(3000);
    const second = makeWindow(3001);
    expect(raiseBodyWindow(first)).toBe(3002);
    expect(raiseBodyWindow(first)).toBe(3002);
    expect(raiseBodyWindow(second)).toBe(3003);
  });

  test("reads custom body limits and resets standalone windows only", () => {
    document.body.setAttribute("data-acm-min-z-index", "4000");
    document.body.setAttribute("data-acm-max-z-index", "4002");
    document.body.setAttribute("data-context-window-reset-counter", "invalid");
    document.body.setAttribute("data-context-window-reset-source", "stale");
    const first = makeWindow(4002);
    const second = makeWindow(4001);
    const provider = makeWindow(5000, false);
    expect(raiseBodyWindow(second)).toBe(4001);
    expect(first.style.zIndex).toBe("4000");
    expect(provider.style.zIndex).toBe("5000");
    expect(document.body.getAttribute("data-context-window-reset-counter")).toBe("1");
    expect(document.body.hasAttribute("data-context-window-reset-source")).toBe(false);
  });

  test("uses the shared range width when the maximum is below the minimum", () => {
    document.body.setAttribute("data-acm-min-z-index", "5000");
    document.body.setAttribute("data-acm-max-z-index", "4000");
    expect(getBodyZIndexLimits()).toEqual({ min: 5000, max: 5100 });
  });
});
