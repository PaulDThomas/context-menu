import { act, fireEvent, renderHook } from "@testing-library/react";
import { DOCK_PANEL_AUTOHIDE_DISTANCE } from "./dockPanelConstants";
import { useAutoHide } from "./useAutoHide";

describe("useAutoHide", () => {
  const makeRef = () => {
    const element = document.createElement("div");
    element.getBoundingClientRect = () => ({ left: 0, right: 100, top: 0, bottom: 20 }) as DOMRect;
    return { current: element };
  };

  test("Starts shown", () => {
    const { result } = renderHook(() => useAutoHide(true, makeRef()));
    expect(result.current[0]).toBe(false);
  });

  test("Hides when the pointer moves beyond the auto-hide distance, and shows when it returns", () => {
    const ref = makeRef();
    const { result } = renderHook(() => useAutoHide(true, ref));
    fireEvent.mouseMove(document, { clientX: 50, clientY: 20 + DOCK_PANEL_AUTOHIDE_DISTANCE + 1 });
    expect(result.current[0]).toBe(true);
    fireEvent.mouseMove(document, { clientX: 50, clientY: 20 + DOCK_PANEL_AUTOHIDE_DISTANCE });
    expect(result.current[0]).toBe(false);
  });

  test("Hides when the pointer leaves the window", () => {
    const { result } = renderHook(() => useAutoHide(true, makeRef()));
    fireEvent.mouseOut(document, { relatedTarget: null });
    expect(result.current[0]).toBe(true);
  });

  test("Ignores mouseout between elements inside the window", () => {
    const { result } = renderHook(() => useAutoHide(true, makeRef()));
    fireEvent.mouseOut(document, { relatedTarget: document.body });
    expect(result.current[0]).toBe(false);
  });

  test("Does nothing while disabled", () => {
    const { result } = renderHook(() => useAutoHide(false, makeRef()));
    fireEvent.mouseMove(document, { clientX: 1000, clientY: 1000 });
    fireEvent.mouseOut(document, { relatedTarget: null });
    expect(result.current[0]).toBe(false);
  });

  test("Reports shown once disabled, even if previously hidden", () => {
    const ref = makeRef();
    const { result, rerender } = renderHook(({ enabled }) => useAutoHide(enabled, ref), {
      initialProps: { enabled: true },
    });
    fireEvent.mouseMove(document, { clientX: 1000, clientY: 1000 });
    expect(result.current[0]).toBe(true);
    rerender({ enabled: false });
    expect(result.current[0]).toBe(false);
  });

  test("The setter overrides the hidden state", () => {
    const { result } = renderHook(() => useAutoHide(true, makeRef()));
    act(() => result.current[1](true));
    expect(result.current[0]).toBe(true);
    act(() => result.current[1](false));
    expect(result.current[0]).toBe(false);
  });

  test("Removes its listeners on unmount", () => {
    const removeSpy = jest.spyOn(document, "removeEventListener");
    const { unmount } = renderHook(() => useAutoHide(true, makeRef()));
    unmount();
    expect(removeSpy).toHaveBeenCalledWith("mousemove", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("mouseout", expect.any(Function));
    removeSpy.mockRestore();
  });
});
