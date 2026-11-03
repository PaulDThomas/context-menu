import { setPanelContentHost } from "./setPanelContentHost";
import { initialDockingState } from "./types";

describe("setPanelContentHost", () => {
  test("sets a panel content host for an edge", () => {
    const state = initialDockingState;
    const div = document.createElement("div");
    const result = setPanelContentHost(state, {
      type: "setPanelContentHost",
      edge: "top",
      host: div,
    });
    expect(result.panelContentHosts.get("top")).toBe(div);
  });

  test("removes a panel content host when set to null", () => {
    let state = initialDockingState;
    const div = document.createElement("div");
    state = {
      ...state,
      panelContentHosts: new Map([["top", div]]),
    };
    const result = setPanelContentHost(state, {
      type: "setPanelContentHost",
      edge: "top",
      host: null,
    });
    expect(result.panelContentHosts.has("top")).toBe(false);
  });

  test("returns the original state if the host hasn't changed", () => {
    const div = document.createElement("div");
    let state = initialDockingState;
    state = {
      ...state,
      panelContentHosts: new Map([["top", div]]),
    };
    const result = setPanelContentHost(state, {
      type: "setPanelContentHost",
      edge: "top",
      host: div,
    });
    expect(result).toBe(state);
  });

  test("preserves other panel content hosts", () => {
    let state = initialDockingState;
    const div1 = document.createElement("div");
    const div2 = document.createElement("div");
    const div3 = document.createElement("div");
    state = {
      ...state,
      panelContentHosts: new Map([
        ["top", div1],
        ["bottom", div2],
      ]),
    };
    const result = setPanelContentHost(state, {
      type: "setPanelContentHost",
      edge: "top",
      host: div3,
    });
    expect(result.panelContentHosts.get("top")).toBe(div3);
    expect(result.panelContentHosts.get("bottom")).toBe(div2);
  });
});
