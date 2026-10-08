import { act, renderHook } from "@testing-library/react";
import { DockingContext } from "../components/DockingContext";
import type { DockingContextValue } from "../components/interface";
import { initialDockingState } from "../reducer";
import { useDocking } from "./useDocking";

describe("useDocking", () => {
  test("raises a registered window by ID and ignores an unknown ID", () => {
    const dispatch = jest.fn();
    const value: DockingContextValue = {
      dispatch,
      maxZIndex: 3100,
      minZIndex: 3000,
      state: { ...initialDockingState, zOrder: ["window-a"] },
      windowControllers: { current: new Map() },
    };
    const { result } = renderHook(() => useDocking(), {
      wrapper: ({ children }) => (
        <DockingContext.Provider value={value}>{children}</DockingContext.Provider>
      ),
    });

    act(() => result.current.showWindowById("window-a"));
    expect(dispatch).toHaveBeenCalledWith({ type: "raiseWindow", id: "window-a" });

    dispatch.mockClear();
    act(() => result.current.showWindowById("missing"));
    expect(dispatch).not.toHaveBeenCalled();
  });

  test("Throws outside a DockingProvider", () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useDocking())).toThrow(
      "useDocking must be used within a DockingProvider",
    );
    errorSpy.mockRestore();
  });
});
