import { renderHook } from "@testing-library/react";
import { DockingContext } from "../components/DockingContext";
import type { DockingContextType } from "../components/interface";
import { useDocking } from "./useDocking";

describe("useDocking", () => {
  test("Returns the docking context value", () => {
    const value = { dock: jest.fn() } as unknown as DockingContextType;
    const { result } = renderHook(() => useDocking(), {
      wrapper: ({ children }) => (
        <DockingContext.Provider value={value}>{children}</DockingContext.Provider>
      ),
    });
    expect(result.current).toBe(value);
  });

  test("Throws outside a DockingProvider", () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useDocking())).toThrow(
      "useDocking must be used within a DockingProvider",
    );
    errorSpy.mockRestore();
  });
});
