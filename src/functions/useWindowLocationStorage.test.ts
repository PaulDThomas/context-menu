import { act, renderHook } from "@testing-library/react";
import { useWindowLocationStorage } from "./useWindowLocationStorage";

const storageKey = "@asup/context-menu:window-location:window-test";

describe("useWindowLocationStorage", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  test("does not read or write storage without a key", () => {
    const { result } = renderHook(() => useWindowLocationStorage(undefined));

    act(() => result.current.saveWindowLocation({ dockEdge: "left" }));

    expect(result.current.location).toBeNull();
    expect(localStorage.length).toBe(0);
  });

  test("loads a valid dock edge and floating rectangle", () => {
    const rect = { x: 80, y: 90, width: 300, height: 200 };
    localStorage.setItem(storageKey, JSON.stringify({ dockEdge: "left", rect }));

    const { result } = renderHook(() => useWindowLocationStorage("window-test"));

    expect(result.current.location).toEqual({ dockEdge: "left", rect });
  });

  test("loads and saves locations when the storage key changes", () => {
    const otherKey = "@asup/context-menu:window-location:window-other";
    const rect = { x: 10, y: 20, width: 250, height: 150 };
    localStorage.setItem(otherKey, JSON.stringify({ dockEdge: "bottom", rect }));
    const { result, rerender } = renderHook(({ key }) => useWindowLocationStorage(key), {
      initialProps: { key: "window-test" },
    });

    rerender({ key: "window-other" });
    expect(result.current.location).toEqual({ dockEdge: "bottom", rect });

    act(() => result.current.saveWindowLocation({ dockEdge: "top" }));
    expect(JSON.parse(localStorage.getItem(otherKey) ?? "null")).toEqual({
      dockEdge: "top",
      rect,
    });
  });

  test("loads a valid rectangle when the saved dock edge is invalid", () => {
    const rect = { x: 10, y: 20, width: 250, height: 150 };
    localStorage.setItem(storageKey, JSON.stringify({ dockEdge: "invalid", rect }));

    const { result } = renderHook(() => useWindowLocationStorage("window-test"));

    expect(result.current.location).toEqual({ dockEdge: null, rect });
  });

  test("keeps a valid dock edge when the saved rectangle is invalid", () => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({ dockEdge: "bottom", rect: { x: 1, y: 2, width: 0, height: 10 } }),
    );

    const { result } = renderHook(() => useWindowLocationStorage("window-test"));

    expect(result.current.location).toEqual({ dockEdge: "bottom", rect: null });
  });

  test.each(["null", "[]", "false", "{", '{"dockEdge":"invalid"}'])(
    "ignores malformed saved location %s",
    (saved) => {
      localStorage.setItem(storageKey, saved);

      const { result } = renderHook(() => useWindowLocationStorage("window-test"));

      expect(result.current.location).toBeNull();
    },
  );

  test("updates the dock edge and rectangle while clearing a saved edge", () => {
    const rect = { x: 80, y: 90, width: 300, height: 200 };
    localStorage.setItem(storageKey, JSON.stringify({ dockEdge: "left", rect }));
    const { result } = renderHook(() => useWindowLocationStorage("window-test"));

    act(() => result.current.saveWindowLocation({ dockEdge: "right" }));
    expect(JSON.parse(localStorage.getItem(storageKey) ?? "null")).toEqual({
      dockEdge: "right",
      rect,
    });

    act(() => result.current.saveWindowLocation({ dockEdge: null }));
    expect(JSON.parse(localStorage.getItem(storageKey) ?? "null")).toEqual({
      dockEdge: null,
      rect,
    });

    act(() => result.current.saveWindowLocation({ rect: null }));
    expect(result.current.location).toEqual({ dockEdge: null, rect: null });
  });

  test("handles blocked local storage reads and writes", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("Storage is blocked");
    });
    const { result } = renderHook(() => useWindowLocationStorage("window-test"));

    expect(result.current.location).toBeNull();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Storage is blocked");
    });

    act(() => result.current.saveWindowLocation({ dockEdge: "top" }));

    expect(result.current.location).toEqual({ dockEdge: "top", rect: null });
  });
});
