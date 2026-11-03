import { registerWindowConfig } from "./registerWindowConfig";
import { initialDockingState } from "./types";

describe("registerWindowConfig", () => {
  test("stores a new window config", () => {
    const result = registerWindowConfig(initialDockingState, {
      type: "registerWindowConfig",
      id: "window-1",
      config: { title: "Window 1", dockable: true },
    });

    expect(result.windowConfigs.get("window-1")).toEqual({ title: "Window 1", dockable: true });
  });

  test("merges config updates", () => {
    const state = registerWindowConfig(initialDockingState, {
      type: "registerWindowConfig",
      id: "window-1",
      config: { title: "Window 1", dockable: true },
    });

    const result = registerWindowConfig(state, {
      type: "registerWindowConfig",
      id: "window-1",
      config: { title: "Window 1 Updated", allowUndock: false },
    });

    expect(result.windowConfigs.get("window-1")).toEqual({
      title: "Window 1 Updated",
      dockable: true,
      allowUndock: false,
    });
  });

  test("returns same state when config does not change", () => {
    const state = registerWindowConfig(initialDockingState, {
      type: "registerWindowConfig",
      id: "window-1",
      config: { title: "Window 1", dockable: true },
    });

    const result = registerWindowConfig(state, {
      type: "registerWindowConfig",
      id: "window-1",
      config: { title: "Window 1", dockable: true },
    });

    expect(result).toBe(state);
  });
});
