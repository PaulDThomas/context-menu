import { act, fireEvent, render, screen } from "@testing-library/react";
import { useContext } from "react";
import { ContextWindow, type ContextWindowHandle, type ContextWindowProps } from "./ContextWindow";
import { DockingContext, DockingProvider } from "./DockingContext";
import { createMockDocking } from "./__mocks__/mockDocking";
import type { DockingContextType } from "./interface";

describe("ContextWindow", () => {
  let docking: DockingContextType;

  const CaptureDocking = (): null => {
    docking = useContext(DockingContext)!;
    return null;
  };

  const renderWindow = (
    props: Partial<ContextWindowProps> = {},
    windowRef?: React.RefObject<ContextWindowHandle | null>,
  ) => {
    const windowProps: ContextWindowProps = {
      id: "test-window",
      title: "Test window",
      visible: true,
      children: <button>Window content</button>,
      ...props,
    };
    return render(
      <DockingProvider>
        <CaptureDocking />
        <ContextWindow
          {...windowProps}
          ref={windowRef}
        />
      </DockingProvider>,
    );
  };

  test("opens floating, saves its position when closed, and restores it on reopen", () => {
    const onOpen = jest.fn();
    const windowProps: ContextWindowProps = {
      id: "restore-window",
      title: "Restore window",
      visible: true,
      onOpen,
      style: { display: "grid" },
      children: "Restorable content",
    };
    const { rerender } = render(
      <DockingProvider>
        <CaptureDocking />
        <ContextWindow {...windowProps} />
      </DockingProvider>,
    );

    const element = document.getElementById("restore-window")!;
    expect(element).toHaveStyle({ visibility: "visible", opacity: "1" });
    expect(onOpen).toHaveBeenCalledTimes(1);

    jest.spyOn(element, "getBoundingClientRect").mockReturnValue(new DOMRect(40, 60, 320, 210));
    rerender(
      <DockingProvider>
        <CaptureDocking />
        <ContextWindow
          {...windowProps}
          visible={false}
        />
      </DockingProvider>,
    );
    expect(document.getElementById("restore-window")).toBeNull();
    expect(docking.getPreDockRect("restore-window")).toMatchObject({
      x: 40,
      y: 60,
      width: 320,
      height: 210,
    });

    rerender(
      <DockingProvider>
        <CaptureDocking />
        <ContextWindow {...windowProps} />
      </DockingProvider>,
    );
    expect(document.getElementById("restore-window")).toHaveStyle({ left: "40px", top: "60px" });
    expect(onOpen).toHaveBeenCalledTimes(2);
  });

  test("opens directly in the configured dock panel and reflects active-window state", () => {
    renderWindow({ initialDockEdge: "left", titleElement: <strong>Custom title</strong> });

    expect(docking.getDockedWindow("test-window")).toMatchObject({ edge: "left" });
    expect(screen.getByRole("separator", { name: "Resize left dock panel" })).toBeInTheDocument();
    expect(screen.getByText("Custom title")).toBeInTheDocument();
    expect(document.getElementById("test-window")).toHaveStyle({
      display: "flex",
      width: "100%",
      height: "100%",
    });
  });

  test("undocks an initially docked window below its anchor", () => {
    const windowRef = { current: null } as React.RefObject<ContextWindowHandle | null>;
    renderWindow({ initialDockEdge: "right" }, windowRef);
    const anchor = document.querySelector(".contextWindowAnchor")!;
    jest.spyOn(anchor, "getBoundingClientRect").mockReturnValue(new DOMRect(25, 35, 10, 20));

    act(() => windowRef.current?.undock());

    expect(docking.getDockedWindow("test-window")).toBeUndefined();
    expect(document.getElementById("test-window")).toHaveStyle({ left: "25px", top: "55px" });
  });

  test("exposes imperative methods and keeps hidden windows undocked", () => {
    const windowRef = { current: null } as React.RefObject<ContextWindowHandle | null>;
    renderWindow({ visible: false }, windowRef);
    expect(windowRef.current).not.toBeNull();
    expect(windowRef.current?.dock).toEqual(expect.any(Function));

    act(() => {
      windowRef.current?.pushToTop();
      windowRef.current?.dock("bottom");
    });

    expect(docking.getDockedWindow("test-window")).toBeUndefined();
    expect(document.getElementById("test-window")).toBeNull();
  });

  test("captures a floating rect, side-switches, and clamps action-undock on-screen", () => {
    const windowRef = { current: null } as React.RefObject<ContextWindowHandle | null>;
    renderWindow({}, windowRef);
    const floating = document.getElementById("test-window")!;
    jest.spyOn(floating, "getBoundingClientRect").mockReturnValue(new DOMRect(950, 700, 200, 100));

    act(() => windowRef.current?.dock("left"));
    expect(docking.getDockedWindow("test-window")).toMatchObject({ edge: "left" });
    expect(docking.getPreDockRect("test-window")).toMatchObject({
      x: 950,
      y: 700,
      width: 200,
      height: 100,
    });

    act(() => windowRef.current?.dock("right"));
    expect(docking.getDockedWindow("test-window")).toMatchObject({ edge: "right" });

    act(() => windowRef.current?.undock());
    expect(docking.getDockedWindow("test-window")).toBeUndefined();
    expect(document.getElementById("test-window")).toHaveStyle({
      left: `${window.innerWidth - 200 - 16}px`,
      top: `${window.innerHeight - 100 - 16}px`,
      width: "200px",
      height: "100px",
    });
  });

  test("anchors a drag-undocked window to the pointer", () => {
    renderWindow({ initialDockEdge: "left" });

    fireEvent.mouseDown(document.querySelector(".contextWindowTitle")!);
    fireEvent.mouseMove(document, { clientX: 100, clientY: 200, movementX: 100, movementY: 0 });

    expect(docking.getDockedWindow("test-window")).toBeUndefined();
    expect(document.getElementById("test-window")).toHaveStyle({ left: "0px", top: "186px" });
  });

  test("moves a floating window with pointer deltas", () => {
    renderWindow();
    const header = document.querySelector(".contextWindowTitle")!;
    const element = document.getElementById("test-window")!;
    fireEvent.mouseDown(header);
    const move = new MouseEvent("mousemove", { bubbles: true, clientX: 400, clientY: 300 });
    Object.defineProperty(move, "movementX", { value: 12 });
    Object.defineProperty(move, "movementY", { value: 8 });
    act(() => document.dispatchEvent(move));

    expect(element.style.transform).toBe("translate(28px, 24px)");
  });

  test("does not translate a docked window while its title is dragged within the edge", () => {
    renderWindow({ initialDockEdge: "left" });
    const header = document.querySelector(".contextWindowTitle")!;
    const element = document.getElementById("test-window")!;
    fireEvent.mouseDown(header);
    const move = new MouseEvent("mousemove", { bubbles: true, clientX: 2, clientY: 200 });
    Object.defineProperty(move, "movementX", { value: 12 });
    Object.defineProperty(move, "movementY", { value: 8 });
    act(() => document.dispatchEvent(move));

    expect(element.style.transform).toBe("");
  });

  test("registered header callbacks guard invalid states and handle valid dock actions", () => {
    renderWindow();

    act(() => docking.requestUndock("test-window"));
    act(() => docking.getWindowConfig("test-window").onUndock?.());
    act(() => docking.getWindowConfig("test-window").onDock?.());
    expect(docking.getDockedWindow("test-window")).toMatchObject({ edge: "right" });

    act(() => docking.getWindowConfig("test-window").onDock?.());
    expect(docking.getDockedWindow("test-window")).toMatchObject({ edge: "right" });

    act(() => docking.getWindowConfig("test-window").onUndock?.());
    expect(docking.getDockedWindow("test-window")).toBeUndefined();
    act(() => docking.getWindowConfig("test-window").onUndock?.());
  });

  test("header callbacks respect dockable and allowUndock options", () => {
    renderWindow({ dockable: false });
    act(() => {
      docking.getWindowConfig("test-window").onDock?.();
      docking.getWindowConfig("test-window").onUndock?.();
    });
    expect(docking.getDockedWindow("test-window")).toBeUndefined();

    const props = {
      id: "locked-window",
      title: "Locked window",
      visible: true,
      initialDockEdge: "left" as const,
      allowUndock: false,
      children: "Locked content",
    };
    render(
      <DockingProvider>
        <CaptureDocking />
        <ContextWindow {...props} />
      </DockingProvider>,
    );
    act(() => docking.getWindowConfig("locked-window").onUndock?.());
    expect(docking.getDockedWindow("locked-window")).toMatchObject({ edge: "left" });
  });

  test("uses the document body when a docked edge has no portal host", () => {
    const dockedWindow = { id: "hostless-window", edge: "left" as const, order: 0 };
    const mockDocking: DockingContextType = createMockDocking(
      new Map([[dockedWindow.id, dockedWindow]]),
      {
        getWindowConfig: () => ({ title: "Hostless window", windowVisible: true }),
        getPanelContentHost: () => null,
      },
    );

    render(
      <DockingContext.Provider value={mockDocking}>
        <ContextWindow
          id="hostless-window"
          title="Hostless window"
          visible
        >
          Hostless content
        </ContextWindow>
      </DockingContext.Provider>,
    );

    expect(document.getElementById("hostless-window")?.parentElement).toBe(document.body);
  });

  test("opens an already docked window without applying floating position", () => {
    const dockedWindow = { id: "pre-docked-window", edge: "top" as const, order: 0 };
    const mockDocking: DockingContextType = createMockDocking(
      new Map([[dockedWindow.id, dockedWindow]]),
      {
        getWindowConfig: () => ({ title: "Pre-docked", windowVisible: false }),
        getPanelContentHost: () => null,
      },
    );

    render(
      <DockingContext.Provider value={mockDocking}>
        <ContextWindow
          id="pre-docked-window"
          title="Pre-docked"
          visible
        >
          Pre-docked content
        </ContextWindow>
      </DockingContext.Provider>,
    );

    expect(document.getElementById("pre-docked-window")?.style.left).toBe("");
    expect(document.getElementById("pre-docked-window")?.style.top).toBe("");
  });

  test("uses default dimensions when opening and the DOM has no measured size", () => {
    const originalWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth");
    const originalHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetHeight");
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
      configurable: true,
      get: () => undefined,
    });
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
      configurable: true,
      get: () => undefined,
    });

    try {
      render(
        <DockingContext.Provider value={createMockDocking(new Map())}>
          <ContextWindow
            id="unmeasured-window"
            title="Unmeasured"
            visible
          >
            Unmeasured content
          </ContextWindow>
        </DockingContext.Provider>,
      );

      expect(document.getElementById("unmeasured-window")).toHaveStyle({
        left: `${Math.max(16, (window.innerWidth - 300) / 2)}px`,
        top: `${Math.max(16, (window.innerHeight - 200) / 2)}px`,
      });
    } finally {
      if (originalWidth) Object.defineProperty(HTMLElement.prototype, "offsetWidth", originalWidth);
      else Reflect.deleteProperty(HTMLElement.prototype, "offsetWidth");
      if (originalHeight)
        Object.defineProperty(HTMLElement.prototype, "offsetHeight", originalHeight);
      else Reflect.deleteProperty(HTMLElement.prototype, "offsetHeight");
    }
  });

  test("undocks a docked window when it is closed", () => {
    const props = {
      id: "test-window",
      title: "Test window",
      initialDockEdge: "left" as const,
      children: "Window content",
    };
    const { rerender } = renderWindow(props);
    expect(docking.getDockedWindow("test-window")).toBeDefined();

    rerender(
      <DockingProvider>
        <CaptureDocking />
        <ContextWindow
          {...props}
          visible={false}
        />
      </DockingProvider>,
    );

    expect(docking.getDockedWindow("test-window")).toBeUndefined();
  });

  test("arms interaction-end after resize and disconnects the observer", () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, "ResizeObserver");
    const observe = jest.fn();
    const disconnect = jest.fn();
    let onResize: ResizeObserverCallback | undefined;
    class MockResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        onResize = callback;
      }
      observe = observe;
      disconnect = disconnect;
      unobserve = jest.fn();
    }
    Object.defineProperty(globalThis, "ResizeObserver", {
      configurable: true,
      value: MockResizeObserver,
    });

    try {
      const view = renderWindow();
      expect(observe).toHaveBeenCalledWith(document.getElementById("test-window"));
      act(() => onResize?.([], {} as ResizeObserver));
      view.unmount();
      expect(disconnect).toHaveBeenCalledTimes(1);
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(globalThis, "ResizeObserver", originalDescriptor);
      } else {
        Reflect.deleteProperty(globalThis, "ResizeObserver");
      }
    }
  });

  test("closes through its title bar callback and skips hidden rendering", () => {
    const onClose = jest.fn();
    const { rerender } = renderWindow({ onClose });
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(
      <DockingProvider>
        <CaptureDocking />
        <ContextWindow
          id="test-window"
          title="Test window"
          visible={false}
          onClose={onClose}
        >
          <button>Window content</button>
        </ContextWindow>
      </DockingProvider>,
    );
    expect(document.getElementById("test-window")).toBeNull();
  });
});
