import { act, fireEvent, render, renderHook } from "@testing-library/react";
import { useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { DockingProvider } from "../components/DockingContext";
import type { DockEdge, DockingContextType } from "../components/interface";
import type { DockingAction } from "../reducer";
import { useContextWindow, type ContextWindowController } from "./useContextWindow";
import * as dockingHook from "./useDocking";
import { useDocking } from "./useDocking";

interface HookWindowProps {
  id?: string;
  title?: string;
  visible?: boolean;
  dockable?: boolean;
  allowUndock?: boolean;
  defaultDockEdge?: DockEdge;
  initialDockEdge?: DockEdge;
  onOpen?: () => void;
  onClose?: () => void;
  capture?: (controller: ContextWindowController) => void;
}

const HookWindow = ({
  id = "hook-window",
  title = "Hook window",
  visible = true,
  dockable = true,
  allowUndock = true,
  defaultDockEdge = "right",
  initialDockEdge,
  onOpen,
  onClose,
  capture,
}: HookWindowProps): React.ReactElement => {
  const window = useContextWindow(id, { onClose, onOpen });
  const {
    divRef,
    handleWindowClick,
    isDocked,
    onTitleMouseDown,
    portalTarget,
    registerWindowConfig,
    setWindowNode,
  } = window;

  useLayoutEffect(() => {
    capture?.(window);
  }, [capture, window]);

  useLayoutEffect(() => {
    registerWindowConfig(id, {
      id,
      title,
      visible,
      dockable,
      allowUndock,
      defaultDockEdge,
      initialDockEdge,
      canClose: onClose !== undefined,
      canDock: dockable && !isDocked,
      canUndock: dockable && isDocked && allowUndock,
    });
  }, [
    allowUndock,
    defaultDockEdge,
    dockable,
    id,
    initialDockEdge,
    onClose,
    title,
    visible,
    isDocked,
    registerWindowConfig,
  ]);

  return (
    <div
      className="contextWindowAnchor"
      ref={divRef}
    >
      {visible &&
        createPortal(
          <div
            id={id}
            ref={setWindowNode}
            style={{ position: "absolute" }}
            onClickCapture={handleWindowClick}
          >
            <div
              className="contextWindowTitle"
              onMouseDown={onTitleMouseDown}
            >
              {title}
            </div>
          </div>,
          portalTarget,
        )}
    </div>
  );
};

describe("useContextWindow", () => {
  let docking: DockingContextType;

  afterEach(() => jest.restoreAllMocks());

  const CaptureDocking = (): null => {
    const context = useDocking();
    useLayoutEffect(() => {
      docking = context;
    }, [context]);
    return null;
  };

  const renderWindow = (props: HookWindowProps = {}) => {
    const initialProps = { id: "hook-window", ...props };
    let controller: ContextWindowController;
    const tree = (nextProps: HookWindowProps) => (
      <DockingProvider>
        <CaptureDocking />
        <HookWindow
          {...nextProps}
          capture={(value) => {
            controller = value;
          }}
        />
      </DockingProvider>
    );
    const view = render(tree(initialProps));
    return {
      ...view,
      docking: () => docking,
      contextWindow: () => controller,
      rerenderWindow: (nextProps: Partial<HookWindowProps>) =>
        view.rerender(tree({ ...initialProps, ...nextProps })),
    };
  };

  test("uses default lifecycle options when omitted", () => {
    const { result } = renderHook(() => useContextWindow("default-options"), {
      wrapper: ({ children }) => <DockingProvider>{children}</DockingProvider>,
    });

    expect(result.current.isDocked).toBe(false);
  });

  test("opens, saves its floating rect when closed, and restores it on reopen", () => {
    const onOpen = jest.fn();
    const { docking: getDocking, rerenderWindow } = renderWindow({ onOpen });
    const element = document.getElementById("hook-window")!;

    expect(element).toBeInTheDocument();
    expect(onOpen).toHaveBeenCalledTimes(1);
    jest.spyOn(element, "getBoundingClientRect").mockReturnValue(new DOMRect(40, 60, 320, 210));

    rerenderWindow({ visible: false });
    expect(document.getElementById("hook-window")).toBeNull();
    expect(getDocking().getPreDockRect("hook-window")).toMatchObject({
      x: 40,
      y: 60,
      width: 320,
      height: 210,
    });

    rerenderWindow({ visible: true });
    expect(document.getElementById("hook-window")).toHaveStyle({ left: "40px", top: "60px" });
    expect(onOpen).toHaveBeenCalledTimes(2);
  });

  test("undocks an initially docked window below its anchor", () => {
    const { docking: getDocking } = renderWindow({ initialDockEdge: "right" });
    const anchor = document.querySelector(".contextWindowAnchor")!;
    jest.spyOn(anchor, "getBoundingClientRect").mockReturnValue(new DOMRect(25, 35, 10, 20));

    act(() => getDocking().getWindowController("hook-window")?.onUndock?.());

    expect(getDocking().getDockedWindow("hook-window")).toBeUndefined();
    expect(document.getElementById("hook-window")).toHaveStyle({ left: "25px", top: "55px" });
  });

  test("undocks without an anchor using fallback coordinates", () => {
    const id = "anchorless-window";
    let dockedWindow: { id: string; edge: DockEdge; order: number } | undefined;
    const dispatch: DockingContextType["dispatch"] = (action: DockingAction) => {
      if (action.type === "dock") {
        dockedWindow = { id, edge: action.edge, order: 0 };
      } else if (action.type === "undock") {
        dockedWindow = undefined;
      }
    };
    const dispatchSpy = jest.fn(dispatch);
    jest.spyOn(dockingHook, "useDocking").mockReturnValue({
      maxZIndex: 3100,
      minZIndex: 3000,
      dispatch: dispatchSpy,
      closeWindow: jest.fn(),
      getActiveWindowOnEdge: () => null,
      showWindowById: jest.fn(),
      getDockedWindow: () => dockedWindow,
      getWindowConfig: (windowId) => ({ title: windowId }),
      getWindowController: () => undefined,
      getPanelContentHost: () => null,
      getPanelZIndex: () => null,
      getPreDockRect: () => null,
      getWindowsOnEdge: () => [],
      getWindowZIndex: () => 3000,
      isEdgeCollapsed: () => false,
      registerWindowController: jest.fn(),
      registerWindowConfig: jest.fn(),
      unregisterWindowController: jest.fn(),
    });
    const { result, rerender } = renderHook(() => useContextWindow(id));

    act(() => result.current.dock("left"));
    rerender();
    expect(result.current.isDocked).toBe(true);
    act(() => result.current.undock());
    rerender();

    expect(result.current.isDocked).toBe(false);
    expect(dispatchSpy).toHaveBeenCalledWith({ type: "undock", id, viaDrag: false });
  });

  test("does not undock a floating window or act on non-dockable controller requests", () => {
    const { docking: getDocking, contextWindow: getWindow } = renderWindow({ dockable: false });

    act(() => {
      getWindow().undock();
      getDocking().getWindowController("hook-window")?.onDock?.("left");
      getDocking().getWindowController("hook-window")?.onUndock?.();
    });

    expect(getDocking().getDockedWindow("hook-window")).toBeUndefined();
  });

  test("captures floating rect, switches dock sides, and clamps action-undock", () => {
    const { docking: getDocking, contextWindow: getWindow } = renderWindow();
    const element = document.getElementById("hook-window")!;
    jest.spyOn(element, "getBoundingClientRect").mockReturnValue(new DOMRect(950, 700, 200, 100));

    act(() => getDocking().getWindowController("hook-window")?.onDock?.("left"));
    expect(getDocking().getDockedWindow("hook-window")).toMatchObject({ edge: "left" });
    expect(getDocking().getPreDockRect("hook-window")).toMatchObject({
      x: 950,
      y: 700,
      width: 200,
      height: 100,
    });

    act(() => getWindow().dock("right"));
    expect(getDocking().getDockedWindow("hook-window")).toMatchObject({ edge: "right" });
    act(() => getDocking().getWindowController("hook-window")?.onUndock?.());

    expect(document.getElementById("hook-window")).toHaveStyle({
      left: `${window.innerWidth - 200 - 16}px`,
      top: `${window.innerHeight - 100 - 16}px`,
      width: "200px",
      height: "100px",
    });
  });

  test("anchors a drag-undocked window to the pointer", () => {
    const { docking: getDocking } = renderWindow({ initialDockEdge: "left" });

    fireEvent.mouseDown(document.querySelector(".contextWindowTitle")!);
    fireEvent.mouseMove(document, { clientX: 100, clientY: 200, movementX: 100, movementY: 0 });

    expect(getDocking().getDockedWindow("hook-window")).toBeUndefined();
    expect(document.getElementById("hook-window")).toHaveStyle({ left: "0px", top: "186px" });
  });

  test("moves a floating window with pointer deltas", () => {
    renderWindow();
    const element = document.getElementById("hook-window")!;
    fireEvent.mouseDown(document.querySelector(".contextWindowTitle")!);
    const move = new MouseEvent("mousemove", { bubbles: true, clientX: 400, clientY: 300 });
    Object.defineProperty(move, "movementX", { value: 12 });
    Object.defineProperty(move, "movementY", { value: 8 });
    act(() => document.dispatchEvent(move));

    expect(element.style.transform).toBe("translate(28px, 24px)");
  });

  test("skips pointer movement when the window node is unavailable", () => {
    const { contextWindow: getWindow } = renderWindow();
    const element = document.getElementById("hook-window")!;
    const transform = element.style.transform;
    act(() => getWindow().setWindowNode(null));

    fireEvent.mouseDown(document.querySelector(".contextWindowTitle")!);
    fireEvent.mouseMove(document, { clientX: 400, clientY: 300, movementX: 12, movementY: 8 });

    expect(element.style.transform).toBe(transform);
  });

  test("opens a window that was already docked without applying floating placement", () => {
    const id = "already-docked";
    const dockedWindow = { id, edge: "left" as const, order: 0 };
    const dispatch = jest.fn();
    jest.spyOn(dockingHook, "useDocking").mockReturnValue({
      maxZIndex: 3100,
      minZIndex: 3000,
      dispatch,
      closeWindow: jest.fn(),
      getDockedWindow: () => dockedWindow,
      getActiveWindowOnEdge: () => null,
      showWindowById: jest.fn(),
      getWindowConfig: () => ({
        title: id,
        visible: true,
        windowVisible: false,
        initialDockEdge: "left",
      }),
      getWindowController: () => undefined,
      getPanelContentHost: () => null,
      getPanelZIndex: () => null,
      getPreDockRect: () => null,
      getWindowsOnEdge: () => [dockedWindow],
      getWindowZIndex: () => 3000,
      isEdgeCollapsed: () => false,
      registerWindowController: jest.fn(),
      registerWindowConfig: jest.fn(),
      unregisterWindowController: jest.fn(),
    });

    render(
      <HookWindow
        id={id}
        visible
        initialDockEdge="left"
      />,
    );

    expect(document.getElementById(id)).toBeInTheDocument();
    expect(dispatch).toHaveBeenCalledWith({ type: "raiseWindow", id });
    expect(dispatch).not.toHaveBeenCalledWith({ type: "dock", id, edge: "left" });
  });

  test.each<DockEdge>(["right", "bottom", "left", "top"])(
    "docks to the requested %s edge",
    (edge) => {
      const { docking: getDocking } = renderWindow();
      act(() => getDocking().getWindowController("hook-window")?.onDock?.(edge));
      expect(getDocking().getDockedWindow("hook-window")).toMatchObject({ edge });
    },
  );

  test("uses default dimensions when opening without a measured size", () => {
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
      renderWindow();
      expect(document.getElementById("hook-window")).toHaveStyle({
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

  test("releases a docked window when it is hidden", () => {
    const { docking: getDocking, rerenderWindow } = renderWindow({ initialDockEdge: "left" });
    expect(getDocking().getDockedWindow("hook-window")).toBeDefined();

    rerenderWindow({ visible: false });

    expect(getDocking().getDockedWindow("hook-window")).toBeUndefined();
  });

  test("arms interaction-end after resize and disconnects its observer", () => {
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
      expect(observe).toHaveBeenCalledWith(document.getElementById("hook-window"));
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
});
