import { act, fireEvent, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { useDocking } from "../functions/useDocking";
import * as dockingHook from "../functions/useOptionalDocking";
import { initialDockingState } from "../reducer";
import { ContextWindow, type ContextWindowHandle, type ContextWindowProps } from "./ContextWindow";
import { DockingProvider } from "./DockingContext";
import { createDockingMock } from "./__mocks__/mockDocking";
import type { DockEdge, DockingContextType } from "./interface";

describe("standalone ContextWindow", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    [
      "data-acm-min-z-index",
      "data-acm-max-z-index",
      "data-context-window-reset-counter",
      "data-context-window-reset-source",
    ].forEach((attribute) => document.body.removeAttribute(attribute));
  });

  const firstRef = (): React.RefObject<ContextWindowHandle | null> => ({ current: null });
  const pair = (ref: React.RefObject<ContextWindowHandle | null>, title = "First") => (
    <>
      <ContextWindow
        id="standalone-first"
        title={title}
        visible
        ref={ref}
      >
        First content
      </ContextWindow>
      <ContextWindow
        id="standalone-second"
        title="Second"
        visible
      >
        Second content
      </ContextWindow>
    </>
  );
  const node = (id: string): HTMLElement => document.getElementById(id)!;

  test("opens without a provider and hides docking controls even with an initial edge", () => {
    const ref = firstRef();
    const onOpen = vi.fn();
    const onClose = vi.fn();
    render(
      <ContextWindow
        id="standalone"
        title="Standalone"
        visible
        initialDockEdge="left"
        onOpen={onOpen}
        onClose={onClose}
        ref={ref}
      >
        Content
      </ContextWindow>,
    );
    expect(node("standalone").parentElement).toBe(document.body);
    expect(node("standalone")).toHaveStyle({ visibility: "visible", opacity: "1", zIndex: "3000" });
    expect(screen.queryByRole("button", { name: "Dock" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Undock" })).not.toBeInTheDocument();
    expect(onOpen).toHaveBeenCalledTimes(1);
    act(() => {
      ref.current?.dock("right");
      ref.current?.undock();
    });
    expect(node("standalone").parentElement).toBe(document.body);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("raises on opening, surface click, title mousedown and imperative action", () => {
    const ref = firstRef();
    render(pair(ref));
    const first = node("standalone-first");
    const second = node("standalone-second");
    expect(first.style.zIndex).toBe("3001");
    expect(second.style.zIndex).toBe("3002");
    fireEvent.click(first);
    expect(first.style.zIndex).toBe("3003");
    fireEvent.click(second);
    fireEvent.mouseDown(screen.getByText("First"));
    expect(first.style.zIndex).toBe("3005");
    fireEvent.mouseUp(document);
    fireEvent.click(second);
    act(() => ref.current?.pushToTop());
    expect(first.style.zIndex).toBe("3007");
    act(() => ref.current?.pushToTop());
    expect(first.style.zIndex).toBe("3007");
  });

  test("resets peers at the custom body limit and preserves React state after rerender", () => {
    document.body.setAttribute("data-acm-min-z-index", "4000");
    document.body.setAttribute("data-acm-max-z-index", "4003");
    const ref = firstRef();
    const view = render(pair(ref));
    act(() => ref.current?.pushToTop());
    expect(node("standalone-first").style.zIndex).toBe("4003");
    fireEvent.click(node("standalone-second"));
    expect(node("standalone-first").style.zIndex).toBe("4000");
    expect(node("standalone-second").style.zIndex).toBe("4001");
    view.rerender(pair(ref, "Renamed first"));
    expect(node("standalone-first").style.zIndex).toBe("4000");
    expect(node("standalone-second").style.zIndex).toBe("4001");
    expect(document.body.getAttribute("data-context-window-reset-counter")).toBe("1");
    document.body.setAttribute("data-acm-min-z-index", "5000");
    document.body.setAttribute("data-acm-max-z-index", "5100");
    act(() => ref.current?.pushToTop());
    expect(node("standalone-first").style.zIndex).toBe("5000");
  });

  test("drags without snapping or modifying panel targets and restores overflow", () => {
    render(pair(firstRef()));
    const first = node("standalone-first");
    const panel = document.createElement("div");
    panel.setAttribute("data-dock-panel-edge", "left");
    panel.setAttribute("data-dock-target", "");
    document.body.appendChild(panel);
    const previousOverflow = document.body.style.overflow;
    fireEvent.mouseDown(screen.getByText("First"));
    expect(document.body.style.overflow).toBe("hidden");
    const move = new MouseEvent("mousemove", { bubbles: true, clientX: 1, clientY: 200 });
    Object.defineProperties(move, { movementX: { value: 12 }, movementY: { value: 8 } });
    fireEvent(document, move);
    expect(first.style.transform).toBe("translate(28px, 24px)");
    fireEvent.mouseUp(document);
    expect(first.parentElement).toBe(document.body);
    expect(panel).toHaveAttribute("data-dock-target");
    expect(document.body.style.overflow).toBe(previousOverflow);
    panel.remove();
  });

  test("saves the floating rect and reopens with lifecycle callbacks", () => {
    const onOpen = vi.fn();
    const tree = (visible: boolean) => (
      <ContextWindow
        id="reopening"
        title="Reopening"
        visible={visible}
        onOpen={onOpen}
      >
        Content
      </ContextWindow>
    );
    const view = render(tree(true));
    vi.spyOn(node("reopening"), "getBoundingClientRect").mockReturnValue(
      new DOMRect(80, 90, 300, 200),
    );
    view.rerender(tree(false));
    expect(document.getElementById("reopening")).toBeNull();
    view.rerender(tree(true));
    expect(node("reopening")).toHaveStyle({
      left: "80px",
      top: "90px",
      width: "300px",
      height: "200px",
      visibility: "visible",
    });
    expect(onOpen).toHaveBeenCalledTimes(2);
  });

  test("does not reset provider windows and removes reset listeners on unmount in StrictMode", () => {
    const removeListener = vi.spyOn(document, "removeEventListener");
    document.body.setAttribute("data-acm-max-z-index", "3002");
    const ref = firstRef();
    const view = render(
      <StrictMode>
        {pair(ref)}
        <DockingProvider
          minZIndex={6000}
          maxZIndex={6100}
        >
          <ContextWindow
            id="managed"
            title="Managed"
            visible
          >
            Managed content
          </ContextWindow>
        </DockingProvider>
      </StrictMode>,
    );
    const managed = node("managed");
    expect(managed).not.toHaveAttribute("data-context-window");
    act(() => ref.current?.pushToTop());
    fireEvent.click(node("standalone-second"));
    expect(managed.style.zIndex).toBe("6000");
    view.unmount();
    expect(removeListener).toHaveBeenCalledWith(
      "context-window-reset-z-index",
      expect.any(Function),
    );
  });
});

describe("ContextWindow", () => {
  afterEach(() => vi.restoreAllMocks());

  let docking: DockingContextType;

  const CaptureDocking = (): null => {
    docking = useDocking();
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

  test("opens in the configured dock panel and reflects active-window state", () => {
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

  test("fades the window while it is moving", () => {
    renderWindow();
    fireEvent.mouseDown(screen.getByText("Test window"));

    expect(document.getElementById("test-window")).toHaveStyle({ opacity: "0.8" });
  });

  test.each<DockEdge | undefined>([undefined, "left"])(
    "renders custom title controls after dock/undock without starting a drag (edge=%s)",
    (initialDockEdge) => {
      const onUndo = vi.fn();
      const onRedo = vi.fn();
      renderWindow({
        initialDockEdge,
        onClose: vi.fn(),
        titleBarButtons: (
          <>
            <button onClick={onUndo}>Undo</button>
            <button onClick={onRedo}>Redo</button>
          </>
        ),
      });

      const undo = screen.getByRole("button", { name: "Undo" });
      const redo = screen.getByRole("button", { name: "Redo" });
      const dockButton = screen.getByRole("button", {
        name: initialDockEdge ? "Undock" : "Dock",
      });
      const closeButton = screen.getByRole("button", { name: "Close" });
      expect(dockButton.nextElementSibling).toBe(undo.parentElement);
      expect(closeButton.previousElementSibling).toBe(undo.parentElement);
      expect(undo.nextElementSibling).toBe(redo);

      fireEvent.pointerDown(undo);
      fireEvent.mouseDown(undo);
      fireEvent.click(undo);
      fireEvent.click(redo);

      expect(onUndo).toHaveBeenCalledTimes(1);
      expect(onRedo).toHaveBeenCalledTimes(1);
      expect(docking.getWindowConfig("test-window").moving).not.toBe(true);
      expect(document.getElementById("test-window")).toHaveStyle({ opacity: "1" });
      expect(document.getElementById("test-window")).not.toHaveAttribute("titleBarButtons");
    },
  );

  test.each<DockEdge>(["right", "bottom", "left", "top"])(
    "the dock button targets the default %s edge after floating and undocking",
    (edge) => {
      renderWindow({ defaultDockEdge: edge });
      expect(docking.getDockedWindow("test-window")).toBeUndefined();

      fireEvent.click(screen.getByRole("button", { name: "Dock" }));
      expect(docking.getDockedWindow("test-window")).toMatchObject({ edge });

      fireEvent.click(screen.getByRole("button", { name: "Undock" }));
      fireEvent.click(screen.getByRole("button", { name: "Dock" }));
      expect(docking.getDockedWindow("test-window")).toMatchObject({ edge });
    },
  );

  test("uses the document body when a docked edge has no portal host", () => {
    const dockedWindow = { id: "hostless-window", edge: "left" as const, order: 0 };
    vi.spyOn(dockingHook, "useOptionalDocking").mockReturnValue(
      createDockingMock(initialDockingState, {
        getActiveWindowOnEdge: () => dockedWindow.id,
        getDockedWindow: () => dockedWindow,
        getWindowConfig: () => ({ title: "Hostless window", windowVisible: true }),
        getWindowsOnEdge: () => [dockedWindow],
      }),
    );

    render(
      <ContextWindow
        id="hostless-window"
        title="Hostless window"
        visible
      >
        Hostless content
      </ContextWindow>,
    );

    expect(document.getElementById("hostless-window")?.parentElement).toBe(document.body);
  });

  test("does not apply floating position to a window that is already docked", () => {
    const dockedWindow = { id: "pre-docked-window", edge: "top" as const, order: 0 };
    vi.spyOn(dockingHook, "useOptionalDocking").mockReturnValue(
      createDockingMock(initialDockingState, {
        getActiveWindowOnEdge: () => dockedWindow.id,
        getDockedWindow: () => dockedWindow,
        getWindowConfig: () => ({ title: "Pre-docked", windowVisible: false }),
        getWindowsOnEdge: () => [dockedWindow],
      }),
    );

    render(
      <ContextWindow
        id="pre-docked-window"
        title="Pre-docked"
        visible
      >
        Pre-docked content
      </ContextWindow>,
    );

    expect(document.getElementById("pre-docked-window")?.style.left).toBe("");
    expect(document.getElementById("pre-docked-window")?.style.top).toBe("");
  });

  test("closes through its title bar action and skips hidden rendering", () => {
    const onClose = vi.fn();
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
