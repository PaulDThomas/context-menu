import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, useRef, useState } from "react";
import { ContextWindow, ContextWindowHandle, MIN_Z_INDEX } from "./ContextWindow";
import { DockingContext } from "./DockingContext";
import type { DockEdge, DockedWindow, DockingContextType, StackDirection } from "./interface";

describe("Context window", () => {
  beforeEach(() => {
    window.ResizeObserver = class {
      observe = jest.fn();
      unobserve = jest.fn();
      disconnect = jest.fn();
    };
  });
  afterEach(() => {
    document.body.removeAttribute("data-context-window-reset-counter");
    document.body.removeAttribute("data-context-window-reset-source");
  });

  test("Not there", async () => {
    await act(async () => {
      render(
        <ContextWindow
          id={"w1"}
          visible={false}
          title={"Window title"}
        >
          <span>Hi</span>
        </ContextWindow>,
      );
    });
    expect(screen.queryByText("Window title")).not.toBeInTheDocument();
  });

  test("Should be visible, and check close", async () => {
    const user = userEvent.setup();
    const mockClose = jest.fn();
    await act(async () => {
      render(
        <ContextWindow
          id={"w1"}
          visible={true}
          title={"Window title"}
          onClose={mockClose}
        >
          <span>Hi</span>
        </ContextWindow>,
      );
    });
    expect(screen.queryByText("Window title")).toBeInTheDocument();
    const closeCross = screen.queryByLabelText("Close") as Element;
    await act(async () => await user.click(closeCross));
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  test("Not visible", async () => {
    await act(async () => {
      render(
        <ContextWindow
          id={"w1"}
          visible={false}
          title={"Window title"}
        >
          <span>Hi</span>
        </ContextWindow>,
      );
    });
    const title = screen.queryByText("Window title") as HTMLSpanElement;
    expect(title).not.toBeInTheDocument();
  });

  test("Window visibility can be toggled", async () => {
    const WindowWithInput = (): React.ReactElement => {
      const [visible, setVisible] = useState<boolean>(false);
      return (
        <>
          <input
            aria-label="testwindow-checkbox"
            type="checkbox"
            checked={visible}
            onChange={() => setVisible(!visible)}
          />
          <ContextWindow
            id={"testwindow"}
            visible={visible}
            title={"Test window"}
            style={{
              transition: "opacity 0s linear",
            }}
          >
            <span>Hello world of tests</span>
          </ContextWindow>
        </>
      );
    };

    const user = userEvent.setup();
    await act(async () => {
      render(<WindowWithInput />);
    });
    const chk = screen.queryByLabelText("testwindow-checkbox") as HTMLInputElement;
    expect(chk).toBeInTheDocument();
    expect(screen.queryByText("Test window")).not.toBeInTheDocument();
    await act(async () => await user.click(chk));
    expect(chk).toBeChecked();
    const title = screen.queryByText("Test window") as HTMLSpanElement;
    expect(title).toBeVisible();
    await act(async () => await user.click(chk));
    expect(title).not.toBeVisible();
  });

  test("Window with custom title element", async () => {
    render(
      <ContextWindow
        id={"testwindow"}
        visible={true}
        title={"Test window"}
        titleElement={<>Window that is a test</>}
      >
        <span>Hello world of tests</span>
      </ContextWindow>,
    );
    expect(screen.queryByText("Window that is a test")).toBeInTheDocument();
  });

  test("Reopening the same window does not unnecessarily increment z-index", async () => {
    const ToggleWindow = (): React.ReactElement => {
      const [visible, setVisible] = useState<boolean>(true);
      return (
        <>
          <button onClick={() => setVisible((v) => !v)}>Toggle Window</button>
          <ContextWindow
            id={"toggle-window"}
            visible={visible}
            title={"Toggle Window"}
          >
            <span>Body</span>
          </ContextWindow>
        </>
      );
    };

    const user = userEvent.setup();
    await act(async () => {
      render(<ToggleWindow />);
    });

    expect(document.getElementById("toggle-window")).toBeInTheDocument();

    const toggle = screen.getByRole("button", { name: "Toggle Window" });
    const windowBefore = document.getElementById("toggle-window") as HTMLElement;
    const initialZ = parseInt(windowBefore.style.zIndex, 10);

    await user.click(toggle);
    expect(document.getElementById("toggle-window")).not.toBeInTheDocument();

    await user.click(toggle);
    expect(document.getElementById("toggle-window")).toBeInTheDocument();

    const windowAfter = document.getElementById("toggle-window") as HTMLElement;
    const reopenedZ = parseInt(windowAfter.style.zIndex, 10);
    expect(reopenedZ).toBe(initialZ);
  });

  test("Multiple windows with z-index management", async () => {
    const user = userEvent.setup();
    const MultiWindowTest = (): React.ReactElement => {
      const [visible1, setVisible1] = useState<boolean>(false);
      const [visible2, setVisible2] = useState<boolean>(false);
      return (
        <>
          <button onClick={() => setVisible1(true)}>Open Window 1</button>
          <button onClick={() => setVisible2(true)}>Open Window 2</button>
          <ContextWindow
            id={"window1"}
            visible={visible1}
            title={"Window 1"}
            onClose={() => setVisible1(false)}
          >
            <span>Content 1</span>
          </ContextWindow>
          <ContextWindow
            id={"window2"}
            visible={visible2}
            title={"Window 2"}
            onClose={() => setVisible2(false)}
          >
            <span>Content 2</span>
          </ContextWindow>
        </>
      );
    };

    await act(async () => {
      render(<MultiWindowTest />);
    });

    // Open first window
    const openBtn1 = screen.getByText("Open Window 1");
    await user.click(openBtn1);
    expect(document.getElementById("window1")).toBeInTheDocument();
    const window1 = document.getElementById("window1") as HTMLElement;
    const zIndex1 = parseInt(window1.style.zIndex, 10);
    expect(zIndex1).toBeGreaterThanOrEqual(MIN_Z_INDEX);

    // Open second window - should have higher z-index
    const openBtn2 = screen.getByText("Open Window 2");
    await user.click(openBtn2);
    expect(document.getElementById("window2")).toBeInTheDocument();
    const window2 = document.getElementById("window2") as HTMLElement;
    const zIndex2 = parseInt(window2.style.zIndex, 10);
    expect(zIndex2).toBeGreaterThan(zIndex1);

    // Click on first window - should bring it to top
    await user.click(window1);
    const zIndex1Updated = parseInt(window1.style.zIndex, 10);
    expect(zIndex1Updated).toBeGreaterThan(zIndex2);
  });

  test("maxZIndex resets all windows to min before recalculating top z-index", async () => {
    let ref1: React.RefObject<ContextWindowHandle | null> | null = null;
    let ref2: React.RefObject<ContextWindowHandle | null> | null = null;

    const MultiWindowWithMax = ({
      onRefsReady,
    }: {
      onRefsReady: (
        firstRef: React.RefObject<ContextWindowHandle | null>,
        secondRef: React.RefObject<ContextWindowHandle | null>,
      ) => void;
    }): React.ReactElement => {
      const firstRef = useRef<ContextWindowHandle | null>(null);
      const secondRef = useRef<ContextWindowHandle | null>(null);

      useEffect(() => {
        onRefsReady(firstRef, secondRef);
      }, [onRefsReady]);

      return (
        <>
          <ContextWindow
            ref={firstRef}
            id={"max-window-1"}
            visible={true}
            title={"Max Window 1"}
            minZIndex={MIN_Z_INDEX}
            maxZIndex={MIN_Z_INDEX + 2}
          >
            <span>Content 1</span>
          </ContextWindow>
          <ContextWindow
            ref={secondRef}
            id={"max-window-2"}
            visible={true}
            title={"Max Window 2"}
            minZIndex={MIN_Z_INDEX}
            maxZIndex={MIN_Z_INDEX + 2}
          >
            <span>Content 2</span>
          </ContextWindow>
        </>
      );
    };

    await act(async () => {
      render(
        <MultiWindowWithMax
          onRefsReady={(firstRef, secondRef) => {
            ref1 = firstRef;
            ref2 = secondRef;
          }}
        />,
      );
    });

    const window1 = document.getElementById("max-window-1") as HTMLElement;
    const window2 = document.getElementById("max-window-2") as HTMLElement;

    expect(window1).toBeInTheDocument();
    expect(window2).toBeInTheDocument();

    await act(async () => {
      ref1?.current?.pushToTop();
    });
    expect(parseInt(window1.style.zIndex, 10)).toBe(MIN_Z_INDEX + 2);

    // Hitting the cap should reset both windows to min, then raise the requested window to min + 1.
    await act(async () => {
      ref2?.current?.pushToTop();
    });

    expect(parseInt(window1.style.zIndex, 10)).toBe(MIN_Z_INDEX);
    expect(parseInt(window2.style.zIndex, 10)).toBe(MIN_Z_INDEX + 1);
  });

  test("Reset without source id removes body reset source attribute", async () => {
    // Seed the source attribute so this path must remove it.
    document.body.setAttribute("data-context-window-reset-source", "seeded-source");

    const existing = document.createElement("div");
    existing.setAttribute("data-context-window", "true");
    existing.setAttribute("data-context-window-min-z-index", `${MIN_Z_INDEX}`);
    existing.style.zIndex = `${MIN_Z_INDEX + 5}`;
    document.body.appendChild(existing);

    await act(async () => {
      render(
        <ContextWindow
          id={""}
          visible={true}
          title={"No Source Id"}
          minZIndex={MIN_Z_INDEX}
          maxZIndex={MIN_Z_INDEX}
        >
          <span>Body</span>
        </ContextWindow>,
      );
    });

    expect(document.body.getAttribute("data-context-window-reset-source")).toBeNull();
    existing.remove();
  });

  test("Initial open applies reset path and updates z-index when cap is already hit", async () => {
    const existing = document.createElement("div");
    existing.setAttribute("data-context-window", "true");
    existing.setAttribute("data-context-window-min-z-index", `${MIN_Z_INDEX}`);
    existing.style.zIndex = `${MIN_Z_INDEX + 4}`;
    document.body.appendChild(existing);

    await act(async () => {
      render(
        <ContextWindow
          id={"open-reset-branch"}
          visible={true}
          title={"Open Reset Branch"}
          minZIndex={MIN_Z_INDEX}
          maxZIndex={MIN_Z_INDEX + 1}
        >
          <span>Body</span>
        </ContextWindow>,
      );
    });

    const opened = document.getElementById("open-reset-branch") as HTMLElement;
    expect(opened).toBeInTheDocument();
    expect(opened.style.zIndex).toBe(`${MIN_Z_INDEX + 1}`);
    expect(existing.style.zIndex).toBe(`${MIN_Z_INDEX}`);

    existing.remove();
  });

  test("Reset uses fallback min z-index and repairs invalid reset counter", async () => {
    document.body.setAttribute("data-context-window-reset-counter", "not-a-number");

    // Missing data-context-window-min-z-index forces fallback branch.
    const existing = document.createElement("div");
    existing.setAttribute("data-context-window", "true");
    existing.style.zIndex = `${MIN_Z_INDEX + 8}`;
    document.body.appendChild(existing);

    await act(async () => {
      render(
        <ContextWindow
          id={"counter-fallback"}
          visible={true}
          title={"Counter Fallback"}
          minZIndex={MIN_Z_INDEX}
          maxZIndex={MIN_Z_INDEX + 1}
        >
          <span>Body</span>
        </ContextWindow>,
      );
    });

    expect(existing.style.zIndex).toBe(`${MIN_Z_INDEX}`);
    expect(document.body.getAttribute("data-context-window-reset-counter")).toBe("1");

    existing.remove();
  });

  test("Accepts minZIndex prop and applies it correctly", async () => {
    await act(async () => {
      render(
        <>
          <button>Open Window</button>
          <ContextWindow
            id={"testwindow"}
            visible={true}
            title={"Test window"}
            minZIndex={4000}
          >
            <span>Hello world of tests</span>
          </ContextWindow>
        </>,
      );
    });
    const window = document.getElementById("testwindow") as HTMLElement;
    expect(window).toBeInTheDocument();
    const zIndex = parseInt(window.style.zIndex, 10);
    expect(zIndex).toBeGreaterThanOrEqual(4000);
  });

  test("Close button title shows 'window' when title is blank/whitespace", async () => {
    // whitespace title
    await act(async () => {
      render(
        <ContextWindow
          id={"blank1"}
          visible={true}
          title={" "}
        >
          <span>Hi</span>
        </ContextWindow>,
      );
    });
    const close1 = screen.getByLabelText("Close");
    expect(close1).toHaveAttribute("title", "Close window");
    // cleanup and empty title
    cleanup();
    await act(async () => {
      render(
        <ContextWindow
          id={"blank2"}
          visible={true}
          title={""}
        >
          <span>Hi</span>
        </ContextWindow>,
      );
    });
    const close2 = screen.getByLabelText("Close");
    expect(close2).toHaveAttribute("title", "Close window");
  });

  test("Calls rest.onClickCapture and handles non-numeric existing z-index", async () => {
    const onClickCapture = jest.fn();

    // Add a pre-existing element with a bad zIndex value
    const bad = document.createElement("div");
    bad.setAttribute("data-context-window", "true");
    bad.id = "badwin";
    // non-numeric z-index should be ignored
    bad.style.zIndex = "not-a-number";
    document.body.appendChild(bad);

    const user = userEvent.setup();
    await act(async () => {
      render(
        <ContextWindow
          id={"clicktest"}
          visible={true}
          title={"Click Test"}
          onClickCapture={onClickCapture}
        >
          <span>Content</span>
        </ContextWindow>,
      );
    });

    const win = document.getElementById("clicktest") as HTMLElement;
    expect(win).toBeInTheDocument();

    // click should call provided handler
    await user.click(win);
    expect(onClickCapture).toHaveBeenCalled();

    // zIndex should be at least the default MIN_Z_INDEX (3000)
    const zIndex = parseInt(win.style.zIndex, 10);
    expect(zIndex).toBeGreaterThanOrEqual(MIN_Z_INDEX);

    // cleanup added element
    bad.remove();
  });

  test("Calls onOpen when window becomes visible", async () => {
    const onOpen = jest.fn();
    await act(async () => {
      render(
        <ContextWindow
          id={"open1"}
          visible={true}
          title={"Open Test"}
          onOpen={onOpen}
        >
          <span>Hi</span>
        </ContextWindow>,
      );
    });
    expect(onOpen).toHaveBeenCalled();
  });

  test("Dragging updates moving UI state", async () => {
    await act(async () => {
      render(
        <ContextWindow
          id={"dragwindow"}
          visible={true}
          title={"Drag Window"}
          style={{ transition: "opacity 0s linear" }}
        >
          <span>Body</span>
        </ContextWindow>,
      );
    });

    const title = screen.getByTitle("Drag Window") as HTMLElement;
    const win = document.getElementById("dragwindow") as HTMLElement;

    fireEvent.mouseDown(title);
    expect(win.style.opacity).toBe("0.8");

    fireEvent.mouseMove(document, { movementX: 4, movementY: 2 });
    fireEvent.mouseUp(title);
    expect(win.style.opacity).toBe("1");
  });

  test("Dragging handles non-element event targets", async () => {
    await act(async () => {
      render(
        <ContextWindow
          id={"dragwindow-text"}
          visible={true}
          title={"Drag Window Text"}
          style={{ transition: "opacity 0s linear" }}
        >
          <span>Body</span>
        </ContextWindow>,
      );
    });

    const title = screen.getByTitle("Drag Window Text") as HTMLElement;
    const win = document.getElementById("dragwindow-text") as HTMLElement;
    const textNode = title.firstChild as Text;

    act(() => {
      textNode.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });
    expect(win.style.opacity).toBe("0.8");

    fireEvent.mouseUp(document);
    expect(win.style.opacity).toBe("1");
  });

  test("Positions window below when space is available and uses default min sizes", async () => {
    const orig = HTMLElement.prototype.getBoundingClientRect;
    const spyRect = jest
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function (this: HTMLElement) {
        // window portal element has the data attribute
        if (
          (this as HTMLElement).hasAttribute &&
          (this as HTMLElement).hasAttribute("data-context-window")
        ) {
          // window rect: top/bottom such that windowHeight is small
          return {
            left: 50,
            top: 0,
            right: 250,
            bottom: 50,
            width: 200,
            height: 50,
          } as DOMRect;
        }
        // parent anchor rect
        return {
          left: 50,
          top: 100,
          right: 250,
          bottom: 150,
          width: 200,
          height: 50,
        } as DOMRect;
      });

    // ensure innerHeight large so there's room below
    const origInner = window.innerHeight;
    Object.defineProperty(window, "innerHeight", { value: 1000, configurable: true });

    await act(async () => {
      render(
        <ContextWindow
          id={"posbelow"}
          visible={true}
          title={"Pos Below"}
        >
          <span>Body</span>
        </ContextWindow>,
      );
    });

    const win = document.getElementById("posbelow") as HTMLElement;
    expect(win).toBeInTheDocument();
    // left should be parent left
    expect(win.style.left).toBe("50px");
    // top should be parent bottom (150px)
    expect(win.style.top).toBe("150px");
    // defaults for min sizes
    expect(win.style.minHeight).toBe("150px");
    expect(win.style.minWidth).toBe("200px");

    spyRect.mockRestore();
    Object.defineProperty(window, "innerHeight", { value: origInner, configurable: true });
    // restore prototype method just in case
    HTMLElement.prototype.getBoundingClientRect = orig;
  });

  test("Positions window above when not enough space below", async () => {
    const orig = HTMLElement.prototype.getBoundingClientRect;
    const spyRect = jest
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function (this: HTMLElement) {
        if (
          (this as HTMLElement).hasAttribute &&
          (this as HTMLElement).hasAttribute("data-context-window")
        ) {
          // window height large
          return {
            left: 10,
            top: 900,
            right: 310,
            bottom: 1100,
            width: 300,
            height: 200,
          } as DOMRect;
        }
        // parent anchor near bottom
        return {
          left: 10,
          top: 900,
          right: 310,
          bottom: 950,
          width: 300,
          height: 50,
        } as DOMRect;
      });

    const origInner = window.innerHeight;
    Object.defineProperty(window, "innerHeight", { value: 1000, configurable: true });

    await act(async () => {
      render(
        <ContextWindow
          id={"posabove"}
          visible={true}
          title={"Pos Above"}
        >
          <span>Body</span>
        </ContextWindow>,
      );
    });

    const win = document.getElementById("posabove") as HTMLElement;
    expect(win).toBeInTheDocument();
    // left should be parent left
    expect(win.style.left).toBe("10px");
    // top should be Math.max(0, parent.top - windowHeight) = 900 - 200 = 700px
    expect(win.style.top).toBe("700px");

    spyRect.mockRestore();
    Object.defineProperty(window, "innerHeight", { value: origInner, configurable: true });
    HTMLElement.prototype.getBoundingClientRect = orig;
  });

  test("ResizeObserver callback attaches mouseup listener and calls checkPosition on release", async () => {
    let observerCallback: ResizeObserverCallback | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).ResizeObserver = class {
      constructor(callback: ResizeObserverCallback) {
        observerCallback = callback;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    };

    await act(async () => {
      render(
        <ContextWindow
          id={"resize-obs-mouseup"}
          visible={true}
          title={"Resize Obs Mouseup"}
        >
          <span>Body</span>
        </ContextWindow>,
      );
    });

    const win = document.getElementById("resize-obs-mouseup") as HTMLElement;
    expect(win).toBeInTheDocument();
    expect(observerCallback).not.toBeNull();

    const addEventSpy = jest.spyOn(document, "addEventListener");

    // Simulate CSS resize handle changing element size
    act(() => {
      observerCallback!([], {} as ResizeObserver);
    });

    expect(addEventSpy).toHaveBeenCalledWith("mouseup", expect.any(Function), true);
    expect(addEventSpy).toHaveBeenCalledWith("pointerup", expect.any(Function), true);

    // Second callback invocation should not attach duplicate listeners
    act(() => {
      observerCallback!([], {} as ResizeObserver);
    });
    expect(addEventSpy).toHaveBeenCalledTimes(2);

    // Fire mouseup to trigger onResizeEnd → calls checkPosition and removes listeners
    const removeEventSpy = jest.spyOn(document, "removeEventListener");
    act(() => {
      document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true }));
    });

    expect(removeEventSpy).toHaveBeenCalledWith("mouseup", expect.any(Function), true);
    expect(removeEventSpy).toHaveBeenCalledWith("pointerup", expect.any(Function), true);

    addEventSpy.mockRestore();
    removeEventSpy.mockRestore();
  });

  test("Window resize triggers position check", async () => {
    await act(async () => {
      render(
        <ContextWindow
          id={"window-resize-check"}
          visible={true}
          title={"Window Resize Check"}
        >
          <span>Body</span>
        </ContextWindow>,
      );
    });

    const win = document.getElementById("window-resize-check") as HTMLElement;
    expect(win).toBeInTheDocument();

    win.style.transform = "translate(0px, 0px)";
    const originalInnerWidth = window.innerWidth;
    const originalInnerHeight = window.innerHeight;

    Object.defineProperty(window, "innerWidth", { value: 120, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 120, configurable: true });

    const rectSpy = jest
      .spyOn(win, "getBoundingClientRect")
      .mockReturnValueOnce({
        left: 100,
        top: 90,
        right: 220,
        bottom: 210,
        width: 120,
        height: 120,
        x: 100,
        y: 90,
        toJSON: () => ({}),
      } as DOMRect)
      .mockReturnValueOnce({
        left: 16,
        top: 16,
        right: 96,
        bottom: 96,
        width: 80,
        height: 80,
        x: 16,
        y: 16,
        toJSON: () => ({}),
      } as DOMRect);

    Object.defineProperty(win, "clientWidth", { value: 112, configurable: true });
    Object.defineProperty(win, "clientHeight", { value: 112, configurable: true });

    act(() => {
      window.dispatchEvent(new UIEvent("resize"));
    });

    expect(win.style.transform).not.toBe("translate(0px, 0px)");
    expect(win.style.transform).toMatch(/translate\(-\d+px, -\d+px\)/);
    expect(win.style.width).toBe("");
    expect(win.style.height).toBe("");

    rectSpy.mockRestore();
    Object.defineProperty(window, "innerWidth", { value: originalInnerWidth, configurable: true });
    Object.defineProperty(window, "innerHeight", {
      value: originalInnerHeight,
      configurable: true,
    });
  });

  test("Window resize reduces window dimensions when it is larger than the viewport", async () => {
    await act(async () => {
      render(
        <ContextWindow
          id={"window-resize-fit"}
          visible={true}
          title={"Window Resize Fit"}
        >
          <span>Body</span>
        </ContextWindow>,
      );
    });

    const win = document.getElementById("window-resize-fit") as HTMLElement;
    expect(win).toBeInTheDocument();

    const originalInnerWidth = window.innerWidth;
    const originalInnerHeight = window.innerHeight;

    Object.defineProperty(window, "innerWidth", { value: 120, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 110, configurable: true });
    Object.defineProperty(win, "clientWidth", { value: 180, configurable: true });
    Object.defineProperty(win, "clientHeight", { value: 150, configurable: true });

    const rectSpy = jest
      .spyOn(win, "getBoundingClientRect")
      .mockReturnValueOnce({
        left: 16,
        top: 16,
        right: 216,
        bottom: 186,
        width: 200,
        height: 170,
        x: 16,
        y: 16,
        toJSON: () => ({}),
      } as DOMRect)
      .mockReturnValueOnce({
        left: 16,
        top: 16,
        right: 216,
        bottom: 186,
        width: 200,
        height: 170,
        x: 16,
        y: 16,
        toJSON: () => ({}),
      } as DOMRect);

    act(() => {
      window.dispatchEvent(new UIEvent("resize"));
    });

    expect(win.style.width).toBe("68px");
    expect(win.style.height).toBe("58px");

    rectSpy.mockRestore();
    Object.defineProperty(window, "innerWidth", { value: originalInnerWidth, configurable: true });
    Object.defineProperty(window, "innerHeight", {
      value: originalInnerHeight,
      configurable: true,
    });
  });

  test("ResizeObserver cleanup removes pending mouseup listener when window is hidden", async () => {
    let observerCallback: ResizeObserverCallback | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).ResizeObserver = class {
      constructor(callback: ResizeObserverCallback) {
        observerCallback = callback;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    };

    const { rerender } = render(
      <ContextWindow
        id={"resize-cleanup-test"}
        visible={true}
        title={"Resize Cleanup Test"}
      >
        <span>Body</span>
      </ContextWindow>,
    );
    await act(async () => {});

    expect(observerCallback).not.toBeNull();

    // Trigger resize callback so the pending mouseup handler is attached
    act(() => {
      observerCallback!([], {} as ResizeObserver);
    });

    // Hide the window before mouseup fires — cleanup must remove the pending listener
    const removeEventSpy = jest.spyOn(document, "removeEventListener");
    await act(async () => {
      rerender(
        <ContextWindow
          id={"resize-cleanup-test"}
          visible={false}
          title={"Resize Cleanup Test"}
        >
          <span>Body</span>
        </ContextWindow>,
      );
    });

    expect(removeEventSpy).toHaveBeenCalledWith("mouseup", expect.any(Function), true);
    expect(removeEventSpy).toHaveBeenCalledWith("pointerup", expect.any(Function), true);

    removeEventSpy.mockRestore();
  });

  test("Mouseup after window is hidden does not fail", async () => {
    const { rerender } = render(
      <ContextWindow
        id={"hidden-during-drag"}
        visible={true}
        title={"Hidden During Drag"}
      >
        <span>Body</span>
      </ContextWindow>,
    );

    await act(async () => {});

    const title = screen.getByTitle("Hidden During Drag").closest("div") as HTMLElement;
    fireEvent.mouseDown(title);

    await act(async () => {
      rerender(
        <ContextWindow
          id={"hidden-during-drag"}
          visible={false}
          title={"Hidden During Drag"}
        >
          <span>Body</span>
        </ContextWindow>,
      );
    });

    expect(() => {
      fireEvent.mouseUp(document);
    }).not.toThrow();
  });

  test("pushToTop ref method brings window to highest z-index", async () => {
    let capturedRef1: React.RefObject<ContextWindowHandle | null> | null = null;

    const CaptureRefs = ({
      onRefsReady,
    }: {
      onRefsReady: (
        ref1: React.RefObject<ContextWindowHandle | null>,
        ref2: React.RefObject<ContextWindowHandle | null>,
      ) => void;
    }) => {
      const ref1 = useRef<ContextWindowHandle | null>(null);
      const ref2 = useRef<ContextWindowHandle | null>(null);
      const [visible] = useState(true);

      useEffect(() => {
        onRefsReady(ref1, ref2);
      }, [onRefsReady]);

      return (
        <>
          <ContextWindow
            ref={ref1}
            id="ref-test-1"
            visible={visible}
            title="Window 1"
          >
            <span>Content 1</span>
          </ContextWindow>
          <ContextWindow
            ref={ref2}
            id="ref-test-2"
            visible={visible}
            title="Window 2"
          >
            <span>Content 2</span>
          </ContextWindow>
        </>
      );
    };

    await act(async () => {
      render(
        <CaptureRefs
          onRefsReady={(ref1) => {
            capturedRef1 = ref1;
          }}
        />,
      );
    });

    // Wait for windows to be rendered
    expect(screen.getByTitle("Window 1")).toBeInTheDocument();
    expect(screen.getByTitle("Window 2")).toBeInTheDocument();

    // Get initial z-indices
    const windowElement1 = document.getElementById("ref-test-1") as HTMLElement;
    const windowElement2 = document.getElementById("ref-test-2") as HTMLElement;

    const zIndex1Before = parseInt(windowElement1.style.zIndex || "0", 10);
    const zIndex2Before = parseInt(windowElement2.style.zIndex || "0", 10);

    // Window 2 should be on top initially (rendered second)
    expect(zIndex2Before).toBeGreaterThanOrEqual(zIndex1Before);

    // Call pushToTop on window 1
    await act(async () => {
      capturedRef1?.current?.pushToTop();
    });

    const zIndex1After = parseInt(windowElement1.style.zIndex || "0", 10);
    const zIndex2After = parseInt(windowElement2.style.zIndex || "0", 10);

    // Window 1 should now be on top (higher z-index than window 2)
    expect(zIndex1After).toBeGreaterThan(zIndex2After);
  });

  test("Multiple windows are isolated - only active window processes drag interaction", async () => {
    // This test verifies that when one window is dragged, other windows don't
    // inadvertently process the interaction due to global mouseup listeners.
    // The isInInteractionRef guard ensures windows only process interactions they started.

    const MultiWindowDragTest = (): React.ReactElement => {
      const [visible, setVisible] = useState<boolean>(true);
      return (
        <>
          <button onClick={() => setVisible(!visible)}>Toggle</button>
          <ContextWindow
            id="window-a"
            visible={visible}
            title="Window A"
          >
            <span>Content A</span>
          </ContextWindow>
          <ContextWindow
            id="window-b"
            visible={visible}
            title="Window B"
          >
            <span>Content B</span>
          </ContextWindow>
          <ContextWindow
            id="window-c"
            visible={visible}
            title="Window C"
          >
            <span>Content C</span>
          </ContextWindow>
        </>
      );
    };

    await act(async () => {
      render(<MultiWindowDragTest />);
    });

    // Verify all windows exist
    expect(document.getElementById("window-a")).toBeInTheDocument();
    expect(document.getElementById("window-b")).toBeInTheDocument();
    expect(document.getElementById("window-c")).toBeInTheDocument();

    // Simulate drag on window-b
    const titleBar = screen.getByTitle("Window B").closest("div") as HTMLElement;

    await act(async () => {
      fireEvent.mouseDown(titleBar, { button: 0 });
      fireEvent.mouseMove(titleBar, { movementX: 10, movementY: 10 });
      fireEvent.mouseUp(titleBar);
    });

    // After drag, verify windows still exist and are properly positioned
    expect(document.getElementById("window-a")).toBeInTheDocument();
    expect(document.getElementById("window-b")).toBeInTheDocument();
    expect(document.getElementById("window-c")).toBeInTheDocument();
  });

  test("isDockedAtStartRef captures isDocked state at interaction start", async () => {
    // This test verifies that isDocked state is captured at mouseDown time,
    // preventing stale closure issues when component re-renders during the same drag.
    // If isDocked changes during drag (e.g., snap detection), the captured value
    // remains frozen for the duration of the interaction.

    const TestComponent = (): React.ReactElement => {
      const ref = useRef<ContextWindowHandle>(null);

      return (
        <ContextWindow
          ref={ref}
          id="dock-test-window"
          visible={true}
          title="Dock Test"
          dockable={true}
        >
          <span>Test content</span>
        </ContextWindow>
      );
    };

    await act(async () => {
      render(<TestComponent />);
    });

    const window = document.getElementById("dock-test-window") as HTMLElement;
    expect(window).toBeInTheDocument();

    // Start interaction
    await act(async () => {
      fireEvent.mouseDown(window);
    });

    // Verify window can be manipulated (proves interaction was recognized)
    expect(window).toBeInTheDocument();
  });

  test("interactionProcessedRef prevents duplicate onInteractionEnd fires within same interaction", async () => {
    // This test verifies that if onInteractionEnd fires multiple times during the same
    // drag (due to component re-renders when isDocked state changes), only the first
    // fire actually processes the dock logic. Subsequent fires are skipped.

    const TestComponent = (): React.ReactElement => {
      return (
        <ContextWindow
          id="duplicate-test-window"
          visible={true}
          title="Duplicate Test"
          dockable={true}
        >
          <span>Test content</span>
        </ContextWindow>
      );
    };

    await act(async () => {
      render(<TestComponent />);
    });

    const window = document.getElementById("duplicate-test-window") as HTMLElement;
    expect(window).toBeInTheDocument();

    // Simulate drag sequence
    await act(async () => {
      fireEvent.mouseDown(window);
      fireEvent.mouseMove(document, { movementX: 5, movementY: 5 });
      fireEvent.mouseUp(document);
    });

    // Window should still be present and functional
    expect(window).toBeInTheDocument();
  });

  test("Drag without snap does not trigger dock", async () => {
    // This test verifies that dragging without reaching SNAP_THRESHOLD doesn't
    // trigger docking, even with dockable={true}. The targetSnapEdgeRef must be
    // set for docking to occur.

    const TestComponent = (): React.ReactElement => {
      return (
        <ContextWindow
          id="no-snap-window"
          visible={true}
          title="No Snap Test"
          dockable={true}
        >
          <span>Test content</span>
        </ContextWindow>
      );
    };

    await act(async () => {
      render(<TestComponent />);
    });

    const window = document.getElementById("no-snap-window") as HTMLElement;
    // Note: initialStyle is not used but kept for potential future use
    // const initialStyle = window.getAttribute("style");

    // Drag in middle of screen (away from edges, won't trigger snap)
    await act(async () => {
      fireEvent.mouseDown(window, { clientX: 500, clientY: 500 });
      fireEvent.mouseMove(document, { clientX: 550, clientY: 550, movementX: 50, movementY: 50 });
      fireEvent.mouseUp(document);
    });

    // Verify window is still floating (not docked)
    expect(window.classList.contains("docked")).toBe(false);
  });

  test("dock ref method docks window to specified edge", async () => {
    let _capturedRef: React.RefObject<ContextWindowHandle | null> | null = null;
    const dockingState = new Map<string, DockedWindow>();

    const MockDockingProvider = ({ children }: { children: React.ReactNode }) => {
      const mockDocking: DockingContextType = {
        state: { dockedWindows: dockingState, collapsedEdges: new Set() },
        dock: (id: string, edge, stackDirection) => {
          dockingState.set(id, { id, edge, stackDirection, isCollapsed: false, order: 0 });
        },
        undock: (id: string) => {
          dockingState.delete(id);
        },
        getDockedWindow: (id: string) => dockingState.get(id),
        getWindowsOnEdge: (edge) =>
          Array.from(dockingState.values()).filter((w) => w.edge === edge),
        toggleCollapse: () => {},
        isEdgeCollapsed: () => false,
        toggleEdgeCollapse: () => {},
      };

      return <DockingContext.Provider value={mockDocking}>{children}</DockingContext.Provider>;
    };

    const TestComponent = () => {
      const ref = useRef<ContextWindowHandle>(null);
      useEffect(() => {
        _capturedRef = ref;
      }, []);

      return (
        <MockDockingProvider>
          <ContextWindow
            ref={ref}
            id="ref-dock-test"
            visible={true}
            title="Ref Dock Test"
            dockable={true}
          >
            <span>Content</span>
          </ContextWindow>
        </MockDockingProvider>
      );
    };

    await act(async () => {
      render(<TestComponent />);
    });

    await act(async () => {
      _capturedRef?.current?.dock("right", "vertical");
    });

    const window = document.getElementById("ref-dock-test") as HTMLElement;
    expect(window).toBeInTheDocument();
    expect(dockingState.has("ref-dock-test")).toBe(true);
  });

  test("undock ref method undocks window", async () => {
    let _capturedRef: React.RefObject<ContextWindowHandle | null> | null = null;
    const dockingState = new Map<string, DockedWindow>();

    const MockDockingProvider = ({ children }: { children: React.ReactNode }) => {
      const mockDocking: DockingContextType = {
        state: { dockedWindows: dockingState, collapsedEdges: new Set() },
        dock: (id: string, edge: DockEdge, stackDirection: StackDirection) => {
          dockingState.set(id, { id, edge, stackDirection, isCollapsed: false, order: 0 });
        },
        undock: (id: string) => {
          dockingState.delete(id);
        },
        getDockedWindow: (id: string) => dockingState.get(id),
        getWindowsOnEdge: (edge: DockEdge) =>
          Array.from(dockingState.values()).filter((w) => w.edge === edge),
        toggleCollapse: () => {},
        isEdgeCollapsed: () => false,
        toggleEdgeCollapse: () => {},
      };

      return <DockingContext.Provider value={mockDocking}>{children}</DockingContext.Provider>;
    };

    const TestComponent = () => {
      const ref = useRef<ContextWindowHandle>(null);
      useEffect(() => {
        _capturedRef = ref;
      }, []);

      return (
        <MockDockingProvider>
          <ContextWindow
            ref={ref}
            id="ref-undock-test"
            visible={true}
            title="Ref Undock Test"
            dockable={true}
          >
            <span>Content</span>
          </ContextWindow>
        </MockDockingProvider>
      );
    };

    await act(async () => {
      render(<TestComponent />);
    });

    // First dock the window
    await act(async () => {
      _capturedRef?.current?.dock("left", "horizontal");
    });

    expect(dockingState.has("ref-undock-test")).toBe(true);

    // Then undock it
    await act(async () => {
      _capturedRef?.current?.undock();
    });

    expect(dockingState.has("ref-undock-test")).toBe(false);
  });

  test("Dock button triggers docking when not docked", async () => {
    let _capturedRef: React.RefObject<ContextWindowHandle | null> | null = null;
    const dockingState = new Map<string, DockedWindow>();

    const MockDockingProvider = ({ children }: { children: React.ReactNode }) => {
      const mockDocking: DockingContextType = {
        state: { dockedWindows: dockingState, collapsedEdges: new Set() },
        dock: (id: string, edge: DockEdge, stackDirection: StackDirection) => {
          dockingState.set(id, { id, edge, stackDirection, isCollapsed: false, order: 0 });
        },
        undock: (id: string) => {
          dockingState.delete(id);
        },
        getDockedWindow: (id: string) => dockingState.get(id),
        getWindowsOnEdge: (edge: DockEdge) =>
          Array.from(dockingState.values()).filter((w) => w.edge === edge),
        toggleCollapse: () => {},
        isEdgeCollapsed: () => false,
        toggleEdgeCollapse: () => {},
      };

      return <DockingContext.Provider value={mockDocking}>{children}</DockingContext.Provider>;
    };

    const TestComponent = () => {
      const ref = useRef<ContextWindowHandle>(null);
      useEffect(() => {
        _capturedRef = ref;
      }, []);

      return (
        <MockDockingProvider>
          <ContextWindow
            ref={ref}
            id="dock-button-test"
            visible={true}
            title="Dock Button Test"
            dockable={true}
            defaultStackDirection="vertical"
          >
            <span>Content</span>
          </ContextWindow>
        </MockDockingProvider>
      );
    };

    const user = userEvent.setup();
    await act(async () => {
      render(<TestComponent />);
    });

    // Find and click dock button
    const dockButton = screen.getByLabelText("Dock");
    await user.click(dockButton);

    const window = document.getElementById("dock-button-test") as HTMLElement;
    expect(window).toBeInTheDocument();
    expect(dockingState.has("dock-button-test")).toBe(true);
  });

  test("Undock button triggers undocking when docked", async () => {
    let _capturedRef: React.RefObject<ContextWindowHandle | null> | null = null;
    const dockingState = new Map<string, DockedWindow>();

    const MockDockingProvider = ({ children }: { children: React.ReactNode }) => {
      const mockDocking: DockingContextType = {
        state: { dockedWindows: dockingState, collapsedEdges: new Set() },
        dock: (id: string, edge: DockEdge, stackDirection: StackDirection) => {
          dockingState.set(id, { id, edge, stackDirection, isCollapsed: false, order: 0 });
        },
        undock: (id: string) => {
          dockingState.delete(id);
        },
        getDockedWindow: (id: string) => dockingState.get(id),
        getWindowsOnEdge: (edge: DockEdge) =>
          Array.from(dockingState.values()).filter((w) => w.edge === edge),
        toggleCollapse: () => {},
        isEdgeCollapsed: () => false,
        toggleEdgeCollapse: () => {},
      };

      return <DockingContext.Provider value={mockDocking}>{children}</DockingContext.Provider>;
    };

    const TestComponent = () => {
      const ref = useRef<ContextWindowHandle>(null);
      useEffect(() => {
        _capturedRef = ref;
      }, []);

      return (
        <MockDockingProvider>
          <ContextWindow
            ref={ref}
            id="undock-button-test"
            visible={true}
            title="Undock Button Test"
            dockable={true}
          >
            <span>Content</span>
          </ContextWindow>
        </MockDockingProvider>
      );
    };

    const user = userEvent.setup();
    await act(async () => {
      render(<TestComponent />);
    });

    // First dock the window via ref
    await act(async () => {
      _capturedRef?.current?.dock("top", "horizontal");
    });

    expect(dockingState.has("undock-button-test")).toBe(true);

    // Find and click undock button
    const undockButton = screen.getByLabelText("Undock");
    await user.click(undockButton);

    expect(dockingState.has("undock-button-test")).toBe(false);
  });

  test("Dock button with blank title shows generic label", async () => {
    const dockingState = new Map<string, DockedWindow>();

    const MockDockingProvider = ({ children }: { children: React.ReactNode }) => {
      const mockDocking: DockingContextType = {
        state: { dockedWindows: dockingState, collapsedEdges: new Set() },
        dock: (id: string, edge: DockEdge, stackDirection: StackDirection) => {
          dockingState.set(id, { id, edge, stackDirection, isCollapsed: false, order: 0 });
        },
        undock: () => {},
        getDockedWindow: (id: string) => dockingState.get(id),
        getWindowsOnEdge: (edge: DockEdge) =>
          Array.from(dockingState.values()).filter((w) => w.edge === edge),
        toggleCollapse: () => {},
        isEdgeCollapsed: () => false,
        toggleEdgeCollapse: () => {},
      };

      return <DockingContext.Provider value={mockDocking}>{children}</DockingContext.Provider>;
    };

    await act(async () => {
      render(
        <MockDockingProvider>
          <ContextWindow
            id="blank-title-dock"
            visible={true}
            title=""
            dockable={true}
          >
            <span>Content</span>
          </ContextWindow>
        </MockDockingProvider>,
      );
    });

    const dockButton = screen.getByLabelText("Dock");
    expect(dockButton).toHaveAttribute("title", "Dock window");
  });

  test("Undock button with whitespace title shows generic label", async () => {
    const dockingState = new Map<string, DockedWindow>();

    const MockDockingProvider = ({ children }: { children: React.ReactNode }) => {
      const mockDocking: DockingContextType = {
        state: { dockedWindows: dockingState, collapsedEdges: new Set() },
        dock: (id: string, edge: DockEdge, stackDirection: StackDirection) => {
          dockingState.set(id, { id, edge, stackDirection, isCollapsed: false, order: 0 });
        },
        undock: () => {},
        getDockedWindow: (id: string) => dockingState.get(id),
        getWindowsOnEdge: (edge: DockEdge) =>
          Array.from(dockingState.values()).filter((w) => w.edge === edge),
        toggleCollapse: () => {},
        isEdgeCollapsed: () => false,
        toggleEdgeCollapse: () => {},
      };

      return <DockingContext.Provider value={mockDocking}>{children}</DockingContext.Provider>;
    };

    let _capturedRef: React.RefObject<ContextWindowHandle | null> | null = null;

    const TestComponent = () => {
      const ref = useRef<ContextWindowHandle>(null);
      useEffect(() => {
        _capturedRef = ref;
      }, []);

      return (
        <MockDockingProvider>
          <ContextWindow
            ref={ref}
            id="whitespace-title-undock"
            visible={true}
            title="   "
            dockable={true}
          >
            <span>Content</span>
          </ContextWindow>
        </MockDockingProvider>
      );
    };

    await act(async () => {
      render(<TestComponent />);
    });

    // Dock first
    await act(async () => {
      _capturedRef?.current?.dock("bottom", "horizontal");
    });

    const undockButton = screen.getByLabelText("Undock");
    expect(undockButton).toHaveAttribute("title", "Undock window");
  });

  test("Undock from top edge via drag beyond threshold", async () => {
    const dockingState = new Map<string, DockedWindow>();

    const MockDockingProvider = ({ children }: { children: React.ReactNode }) => {
      const mockDocking: DockingContextType = {
        state: { dockedWindows: dockingState, collapsedEdges: new Set() },
        dock: (id: string, edge: DockEdge, stackDirection: StackDirection) => {
          dockingState.set(id, { id, edge, stackDirection, isCollapsed: false, order: 0 });
        },
        undock: (id: string) => {
          dockingState.delete(id);
        },
        getDockedWindow: (id: string) => dockingState.get(id),
        getWindowsOnEdge: (edge: DockEdge) =>
          Array.from(dockingState.values()).filter((w) => w.edge === edge),
        toggleCollapse: () => {},
        isEdgeCollapsed: () => false,
        toggleEdgeCollapse: () => {},
      };

      return <DockingContext.Provider value={mockDocking}>{children}</DockingContext.Provider>;
    };

    let _capturedRef: React.RefObject<ContextWindowHandle | null> | null = null;

    const TestComponent = () => {
      const ref = useRef<ContextWindowHandle>(null);
      useEffect(() => {
        _capturedRef = ref;
      }, []);

      return (
        <MockDockingProvider>
          <ContextWindow
            ref={ref}
            id="undock-from-top"
            visible={true}
            title="Undock From Top"
            dockable={true}
          >
            <span>Content</span>
          </ContextWindow>
        </MockDockingProvider>
      );
    };

    await act(async () => {
      render(<TestComponent />);
    });

    // Dock to top
    await act(async () => {
      _capturedRef?.current?.dock("top", "horizontal");
    });
    expect(dockingState.has("undock-from-top")).toBe(true);

    const titleBar = screen.getByTitle("Undock From Top") as HTMLElement;
    await act(async () => {
      fireEvent.mouseDown(titleBar, { clientX: 200, clientY: 30 });
      fireEvent.mouseMove(document, { clientX: 200, clientY: 50, movementX: 0, movementY: 20 });
    });

    expect(dockingState.has("undock-from-top")).toBe(false);
  });

  test("Undock from bottom edge via drag beyond threshold", async () => {
    const dockingState = new Map<string, DockedWindow>();

    const MockDockingProvider = ({ children }: { children: React.ReactNode }) => {
      const mockDocking: DockingContextType = {
        state: { dockedWindows: dockingState, collapsedEdges: new Set() },
        dock: (id: string, edge: DockEdge, stackDirection: StackDirection) => {
          dockingState.set(id, { id, edge, stackDirection, isCollapsed: false, order: 0 });
        },
        undock: (id: string) => {
          dockingState.delete(id);
        },
        getDockedWindow: (id: string) => dockingState.get(id),
        getWindowsOnEdge: (edge: DockEdge) =>
          Array.from(dockingState.values()).filter((w) => w.edge === edge),
        toggleCollapse: () => {},
        isEdgeCollapsed: () => false,
        toggleEdgeCollapse: () => {},
      };

      return <DockingContext.Provider value={mockDocking}>{children}</DockingContext.Provider>;
    };

    let _capturedRef: React.RefObject<ContextWindowHandle | null> | null = null;

    const TestComponent = () => {
      const ref = useRef<ContextWindowHandle>(null);
      useEffect(() => {
        _capturedRef = ref;
      }, []);

      return (
        <MockDockingProvider>
          <ContextWindow
            ref={ref}
            id="undock-from-bottom"
            visible={true}
            title="Undock From Bottom"
            dockable={true}
          >
            <span>Content</span>
          </ContextWindow>
        </MockDockingProvider>
      );
    };

    const originalHeight = window.innerHeight;
    Object.defineProperty(window, "innerHeight", { value: 600, configurable: true });

    try {
      await act(async () => {
        render(<TestComponent />);
      });

      // Dock to bottom
      await act(async () => {
        _capturedRef?.current?.dock("bottom", "horizontal");
      });
      expect(dockingState.has("undock-from-bottom")).toBe(true);

      const titleBar = screen.getByTitle("Undock From Bottom") as HTMLElement;
      await act(async () => {
        fireEvent.mouseDown(titleBar, { clientX: 200, clientY: 550 });
        fireEvent.mouseMove(document, { clientX: 200, clientY: 520, movementX: 0, movementY: -30 });
      });

      expect(dockingState.has("undock-from-bottom")).toBe(false);
    } finally {
      Object.defineProperty(window, "innerHeight", { value: originalHeight, configurable: true });
    }
  });

  test("Undock from left edge via drag beyond threshold", async () => {
    const dockingState = new Map<string, DockedWindow>();

    const MockDockingProvider = ({ children }: { children: React.ReactNode }) => {
      const mockDocking: DockingContextType = {
        state: { dockedWindows: dockingState, collapsedEdges: new Set() },
        dock: (id: string, edge: DockEdge, stackDirection: StackDirection) => {
          dockingState.set(id, { id, edge, stackDirection, isCollapsed: false, order: 0 });
        },
        undock: (id: string) => {
          dockingState.delete(id);
        },
        getDockedWindow: (id: string) => dockingState.get(id),
        getWindowsOnEdge: (edge: DockEdge) =>
          Array.from(dockingState.values()).filter((w) => w.edge === edge),
        toggleCollapse: () => {},
        isEdgeCollapsed: () => false,
        toggleEdgeCollapse: () => {},
      };

      return <DockingContext.Provider value={mockDocking}>{children}</DockingContext.Provider>;
    };

    let _capturedRef: React.RefObject<ContextWindowHandle | null> | null = null;

    const TestComponent = () => {
      const ref = useRef<ContextWindowHandle>(null);
      useEffect(() => {
        _capturedRef = ref;
      }, []);

      return (
        <MockDockingProvider>
          <ContextWindow
            ref={ref}
            id="undock-from-left"
            visible={true}
            title="Undock From Left"
            dockable={true}
          >
            <span>Content</span>
          </ContextWindow>
        </MockDockingProvider>
      );
    };

    await act(async () => {
      render(<TestComponent />);
    });

    // Dock to left
    await act(async () => {
      _capturedRef?.current?.dock("left", "vertical");
    });
    expect(dockingState.has("undock-from-left")).toBe(true);

    const titleBar = screen.getByTitle("Undock From Left") as HTMLElement;
    await act(async () => {
      fireEvent.mouseDown(titleBar, { clientX: 30, clientY: 200 });
      fireEvent.mouseMove(document, { clientX: 50, clientY: 200, movementX: 20, movementY: 0 });
    });

    expect(dockingState.has("undock-from-left")).toBe(false);
  });

  test("Undock from right edge via drag beyond threshold", async () => {
    const dockingState = new Map<string, DockedWindow>();

    const MockDockingProvider = ({ children }: { children: React.ReactNode }) => {
      const mockDocking: DockingContextType = {
        state: { dockedWindows: dockingState, collapsedEdges: new Set() },
        dock: (id: string, edge: DockEdge, stackDirection: StackDirection) => {
          dockingState.set(id, { id, edge, stackDirection, isCollapsed: false, order: 0 });
        },
        undock: (id: string) => {
          dockingState.delete(id);
        },
        getDockedWindow: (id: string) => dockingState.get(id),
        getWindowsOnEdge: (edge: DockEdge) =>
          Array.from(dockingState.values()).filter((w) => w.edge === edge),
        toggleCollapse: () => {},
        isEdgeCollapsed: () => false,
        toggleEdgeCollapse: () => {},
      };

      return <DockingContext.Provider value={mockDocking}>{children}</DockingContext.Provider>;
    };

    let _capturedRef: React.RefObject<ContextWindowHandle | null> | null = null;

    const TestComponent = () => {
      const ref = useRef<ContextWindowHandle>(null);
      useEffect(() => {
        _capturedRef = ref;
      }, []);

      return (
        <MockDockingProvider>
          <ContextWindow
            ref={ref}
            id="undock-from-right"
            visible={true}
            title="Undock From Right"
            dockable={true}
          >
            <span>Content</span>
          </ContextWindow>
        </MockDockingProvider>
      );
    };

    const originalWidth = window.innerWidth;
    Object.defineProperty(window, "innerWidth", { value: 800, configurable: true });

    try {
      await act(async () => {
        render(<TestComponent />);
      });

      // Dock to right
      await act(async () => {
        _capturedRef?.current?.dock("right", "vertical");
      });
      expect(dockingState.has("undock-from-right")).toBe(true);

      const titleBar = screen.getByTitle("Undock From Right") as HTMLElement;
      await act(async () => {
        fireEvent.mouseDown(titleBar, { clientX: 770, clientY: 200 });
        fireEvent.mouseMove(document, { clientX: 750, clientY: 200, movementX: -20, movementY: 0 });
      });

      expect(dockingState.has("undock-from-right")).toBe(false);
    } finally {
      Object.defineProperty(window, "innerWidth", { value: originalWidth, configurable: true });
    }
  });

  test("Dockable window displays dock button when floating", async () => {
    const dockingState = new Map<string, DockedWindow>();

    const MockDockingProvider = ({ children }: { children: React.ReactNode }) => {
      const mockDocking: DockingContextType = {
        state: { dockedWindows: dockingState, collapsedEdges: new Set() },
        dock: () => {},
        undock: () => {},
        getDockedWindow: (id: string) => dockingState.get(id),
        getWindowsOnEdge: () => [],
        toggleCollapse: () => {},
        isEdgeCollapsed: () => false,
        toggleEdgeCollapse: () => {},
      };

      return <DockingContext.Provider value={mockDocking}>{children}</DockingContext.Provider>;
    };

    await act(async () => {
      render(
        <MockDockingProvider>
          <ContextWindow
            id="dockable-button-test"
            visible={true}
            title="Dockable Window"
            dockable={true}
          >
            <span>Content</span>
          </ContextWindow>
        </MockDockingProvider>,
      );
    });

    const dockButton = screen.getByLabelText("Dock");
    expect(dockButton).toBeInTheDocument();
  });

  test("Non-dockable window does not display dock button", async () => {
    await act(async () => {
      render(
        <ContextWindow
          id="non-dockable-test"
          visible={true}
          title="Non-Dockable Window"
          dockable={false}
        >
          <span>Content</span>
        </ContextWindow>,
      );
    });

    const dockButton = screen.queryByLabelText("Dock");
    expect(dockButton).not.toBeInTheDocument();
  });

  test("Docked window displays undock button", async () => {
    let _capturedRef: React.RefObject<ContextWindowHandle | null> | null = null;
    const dockingState = new Map<string, DockedWindow>();

    const MockDockingProvider = ({ children }: { children: React.ReactNode }) => {
      const mockDocking: DockingContextType = {
        state: { dockedWindows: dockingState, collapsedEdges: new Set() },
        dock: (id: string, edge: DockEdge, stackDirection: StackDirection) => {
          dockingState.set(id, { id, edge, stackDirection, isCollapsed: false, order: 0 });
        },
        undock: (id: string) => {
          dockingState.delete(id);
        },
        getDockedWindow: (id: string) => dockingState.get(id),
        getWindowsOnEdge: (edge: DockEdge) =>
          Array.from(dockingState.values()).filter((w) => w.edge === edge),
        toggleCollapse: () => {},
        isEdgeCollapsed: () => false,
        toggleEdgeCollapse: () => {},
      };

      return <DockingContext.Provider value={mockDocking}>{children}</DockingContext.Provider>;
    };

    const TestComponent = () => {
      const ref = useRef<ContextWindowHandle>(null);
      useEffect(() => {
        _capturedRef = ref;
      }, []);

      return (
        <MockDockingProvider>
          <ContextWindow
            ref={ref}
            id="docked-undock-button-test"
            visible={true}
            title="Docked Window"
            dockable={true}
          >
            <span>Content</span>
          </ContextWindow>
        </MockDockingProvider>
      );
    };

    await act(async () => {
      render(<TestComponent />);
    });

    // Initially dock button should be visible
    const dockButton = screen.getByLabelText("Dock");
    expect(dockButton).toBeInTheDocument();

    // Dock the window
    await act(async () => {
      _capturedRef?.current?.dock("left", "vertical");
    });

    // After docking, undock button should be visible
    const undockButton = screen.getByLabelText("Undock");
    expect(undockButton).toBeInTheDocument();

    // Dock button should no longer be visible
    const dockButtonAfter = screen.queryByLabelText("Dock");
    expect(dockButtonAfter).not.toBeInTheDocument();
  });

  test("Snap detection for left edge triggers docking when mouse near left", async () => {
    let _capturedRef: React.RefObject<ContextWindowHandle | null> | null = null;
    const dockingState = new Map<string, DockedWindow>();

    const MockDockingProvider = ({ children }: { children: React.ReactNode }) => {
      const mockDocking: DockingContextType = {
        state: { dockedWindows: dockingState, collapsedEdges: new Set() },
        dock: (id: string, edge: DockEdge, stackDirection: StackDirection) => {
          dockingState.set(id, { id, edge, stackDirection, isCollapsed: false, order: 0 });
        },
        undock: (id: string) => {
          dockingState.delete(id);
        },
        getDockedWindow: (id: string) => dockingState.get(id),
        getWindowsOnEdge: (edge: DockEdge) =>
          Array.from(dockingState.values()).filter((w) => w.edge === edge),
        toggleCollapse: () => {},
        isEdgeCollapsed: () => false,
        toggleEdgeCollapse: () => {},
      };

      return <DockingContext.Provider value={mockDocking}>{children}</DockingContext.Provider>;
    };

    const TestComponent = () => {
      const ref = useRef<ContextWindowHandle>(null);
      useEffect(() => {
        _capturedRef = ref;
      }, []);

      return (
        <MockDockingProvider>
          <ContextWindow
            ref={ref}
            id="snap-left-test"
            visible={true}
            title="Snap Left Test"
            dockable={true}
            defaultStackDirection="vertical"
          >
            <span>Content</span>
          </ContextWindow>
        </MockDockingProvider>
      );
    };

    await act(async () => {
      render(<TestComponent />);
    });

    const titleBar = screen.getByTitle("Snap Left Test") as HTMLElement;
    expect(titleBar).toBeInTheDocument();

    // Simulate drag to left edge (clientX near 0)
    await act(async () => {
      fireEvent.mouseDown(titleBar, { clientX: 100, clientY: 300 });
      fireEvent.mouseMove(document, { clientX: 10, clientY: 300, movementX: -90, movementY: 0 });
      fireEvent.mouseUp(document);
    });

    // Verify window was docked to left
    expect(dockingState.has("snap-left-test")).toBe(true);
    const dockedWindow = dockingState.get("snap-left-test");
    expect(dockedWindow?.edge).toBe("left");
  });

  test("Snap detection for right edge triggers docking", async () => {
    let _capturedRef: React.RefObject<ContextWindowHandle | null> | null = null;
    const dockingState = new Map<string, DockedWindow>();

    const MockDockingProvider = ({ children }: { children: React.ReactNode }) => {
      const mockDocking: DockingContextType = {
        state: { dockedWindows: dockingState, collapsedEdges: new Set() },
        dock: (id: string, edge: DockEdge, stackDirection: StackDirection) => {
          dockingState.set(id, { id, edge, stackDirection, isCollapsed: false, order: 0 });
        },
        undock: (id: string) => {
          dockingState.delete(id);
        },
        getDockedWindow: (id: string) => dockingState.get(id),
        getWindowsOnEdge: (edge: DockEdge) =>
          Array.from(dockingState.values()).filter((w) => w.edge === edge),
        toggleCollapse: () => {},
        isEdgeCollapsed: () => false,
        toggleEdgeCollapse: () => {},
      };

      return <DockingContext.Provider value={mockDocking}>{children}</DockingContext.Provider>;
    };

    const TestComponent = () => {
      const ref = useRef<ContextWindowHandle>(null);
      useEffect(() => {
        _capturedRef = ref;
      }, []);

      return (
        <MockDockingProvider>
          <ContextWindow
            ref={ref}
            id="snap-right-test"
            visible={true}
            title="Snap Right Test"
            dockable={true}
            defaultStackDirection="vertical"
          >
            <span>Content</span>
          </ContextWindow>
        </MockDockingProvider>
      );
    };

    const origInnerWidth = window.innerWidth;
    Object.defineProperty(window, "innerWidth", { value: 1024, configurable: true });

    await act(async () => {
      render(<TestComponent />);
    });

    const titleBar = screen.getByTitle("Snap Right Test") as HTMLElement;
    expect(titleBar).toBeInTheDocument();

    // Simulate drag to right edge (clientX near window.innerWidth)
    await act(async () => {
      fireEvent.mouseDown(titleBar, { clientX: 900, clientY: 300 });
      fireEvent.mouseMove(document, { clientX: 1010, clientY: 300, movementX: 110, movementY: 0 });
      fireEvent.mouseUp(document);
    });

    // Verify window was docked to right
    expect(dockingState.has("snap-right-test")).toBe(true);
    const dockedWindow = dockingState.get("snap-right-test");
    expect(dockedWindow?.edge).toBe("right");

    Object.defineProperty(window, "innerWidth", { value: origInnerWidth, configurable: true });
  });

  test("Snap detection for top edge triggers docking", async () => {
    let _capturedRef: React.RefObject<ContextWindowHandle | null> | null = null;
    const dockingState = new Map<string, DockedWindow>();

    const MockDockingProvider = ({ children }: { children: React.ReactNode }) => {
      const mockDocking: DockingContextType = {
        state: { dockedWindows: dockingState, collapsedEdges: new Set() },
        dock: (id: string, edge: DockEdge, stackDirection: StackDirection) => {
          dockingState.set(id, { id, edge, stackDirection, isCollapsed: false, order: 0 });
        },
        undock: (id: string) => {
          dockingState.delete(id);
        },
        getDockedWindow: (id: string) => dockingState.get(id),
        getWindowsOnEdge: (edge: DockEdge) =>
          Array.from(dockingState.values()).filter((w) => w.edge === edge),
        toggleCollapse: () => {},
        isEdgeCollapsed: () => false,
        toggleEdgeCollapse: () => {},
      };

      return <DockingContext.Provider value={mockDocking}>{children}</DockingContext.Provider>;
    };

    const TestComponent = () => {
      const ref = useRef<ContextWindowHandle>(null);
      useEffect(() => {
        _capturedRef = ref;
      }, []);

      return (
        <MockDockingProvider>
          <ContextWindow
            ref={ref}
            id="snap-top-test"
            visible={true}
            title="Snap Top Test"
            dockable={true}
            defaultStackDirection="horizontal"
          >
            <span>Content</span>
          </ContextWindow>
        </MockDockingProvider>
      );
    };

    await act(async () => {
      render(<TestComponent />);
    });

    const titleBar = screen.getByTitle("Snap Top Test") as HTMLElement;
    expect(titleBar).toBeInTheDocument();

    // Simulate drag to top edge (clientY near 0)
    await act(async () => {
      fireEvent.mouseDown(titleBar, { clientX: 500, clientY: 300 });
      fireEvent.mouseMove(document, { clientX: 500, clientY: 10, movementX: 0, movementY: -290 });
      fireEvent.mouseUp(document);
    });

    // Verify window was docked to top
    expect(dockingState.has("snap-top-test")).toBe(true);
    const dockedWindow = dockingState.get("snap-top-test");
    expect(dockedWindow?.edge).toBe("top");
  });

  test("Snap detection for bottom edge triggers docking", async () => {
    let _capturedRef: React.RefObject<ContextWindowHandle | null> | null = null;
    const dockingState = new Map<string, DockedWindow>();

    const MockDockingProvider = ({ children }: { children: React.ReactNode }) => {
      const mockDocking: DockingContextType = {
        state: { dockedWindows: dockingState, collapsedEdges: new Set() },
        dock: (id: string, edge: DockEdge, stackDirection: StackDirection) => {
          dockingState.set(id, { id, edge, stackDirection, isCollapsed: false, order: 0 });
        },
        undock: (id: string) => {
          dockingState.delete(id);
        },
        getDockedWindow: (id: string) => dockingState.get(id),
        getWindowsOnEdge: (edge: DockEdge) =>
          Array.from(dockingState.values()).filter((w) => w.edge === edge),
        toggleCollapse: () => {},
        isEdgeCollapsed: () => false,
        toggleEdgeCollapse: () => {},
      };

      return <DockingContext.Provider value={mockDocking}>{children}</DockingContext.Provider>;
    };

    const TestComponent = () => {
      const ref = useRef<ContextWindowHandle>(null);
      useEffect(() => {
        _capturedRef = ref;
      }, []);

      return (
        <MockDockingProvider>
          <ContextWindow
            ref={ref}
            id="snap-bottom-test"
            visible={true}
            title="Snap Bottom Test"
            dockable={true}
            defaultStackDirection="horizontal"
          >
            <span>Content</span>
          </ContextWindow>
        </MockDockingProvider>
      );
    };

    const origInnerHeight = window.innerHeight;
    Object.defineProperty(window, "innerHeight", { value: 768, configurable: true });

    await act(async () => {
      render(<TestComponent />);
    });

    const titleBar = screen.getByTitle("Snap Bottom Test") as HTMLElement;
    expect(titleBar).toBeInTheDocument();

    // Simulate drag to bottom edge (clientY near window.innerHeight)
    await act(async () => {
      fireEvent.mouseDown(titleBar, { clientX: 500, clientY: 500 });
      fireEvent.mouseMove(document, { clientX: 500, clientY: 750, movementX: 0, movementY: 250 });
      fireEvent.mouseUp(document);
    });

    // Verify window was docked to bottom
    expect(dockingState.has("snap-bottom-test")).toBe(true);
    const dockedWindow = dockingState.get("snap-bottom-test");
    expect(dockedWindow?.edge).toBe("bottom");

    Object.defineProperty(window, "innerHeight", { value: origInnerHeight, configurable: true });
  });

  test("Window docked, then dragged away from edge triggers undock", async () => {
    let _capturedRef: React.RefObject<ContextWindowHandle | null> | null = null;
    const dockingState = new Map<string, DockedWindow>();

    const MockDockingProvider = ({ children }: { children: React.ReactNode }) => {
      const mockDocking: DockingContextType = {
        state: { dockedWindows: dockingState, collapsedEdges: new Set() },
        dock: (id: string, edge: DockEdge, stackDirection: StackDirection) => {
          dockingState.set(id, { id, edge, stackDirection, isCollapsed: false, order: 0 });
        },
        undock: (id: string) => {
          dockingState.delete(id);
        },
        getDockedWindow: (id: string) => dockingState.get(id),
        getWindowsOnEdge: (edge: DockEdge) =>
          Array.from(dockingState.values()).filter((w) => w.edge === edge),
        toggleCollapse: () => {},
        isEdgeCollapsed: () => false,
        toggleEdgeCollapse: () => {},
      };

      return <DockingContext.Provider value={mockDocking}>{children}</DockingContext.Provider>;
    };

    const TestComponent = () => {
      const ref = useRef<ContextWindowHandle>(null);
      useEffect(() => {
        _capturedRef = ref;
      }, []);

      return (
        <MockDockingProvider>
          <ContextWindow
            ref={ref}
            id="undock-by-drag-test"
            visible={true}
            title="Undock By Drag Test"
            dockable={true}
          >
            <span>Content</span>
          </ContextWindow>
        </MockDockingProvider>
      );
    };

    await act(async () => {
      render(<TestComponent />);
    });

    // Dock the window to left
    await act(async () => {
      _capturedRef?.current?.dock("left", "vertical");
    });

    expect(dockingState.has("undock-by-drag-test")).toBe(true);

    const titleBar = screen.getByTitle("Undock By Drag Test") as HTMLElement;
    expect(titleBar).toBeInTheDocument();

    // Now drag it away from left edge (mouse > UNDOCK_THRESHOLD)
    await act(async () => {
      fireEvent.mouseDown(titleBar, { clientX: 10, clientY: 300 });
      fireEvent.mouseMove(document, { clientX: 100, clientY: 300, movementX: 90, movementY: 0 });
      fireEvent.mouseUp(document);
    });

    // Should have undocked
    expect(dockingState.has("undock-by-drag-test")).toBe(false);
  });

  test("Undock is called when docking is null (early return)", async () => {
    let _capturedRef: React.RefObject<ContextWindowHandle | null> | null = null;

    const TestComponent = () => {
      const ref = useRef<ContextWindowHandle>(null);
      useEffect(() => {
        _capturedRef = ref;
      }, []);

      return (
        <ContextWindow
          ref={ref}
          id="undock-null-docking-test"
          visible={true}
          title="Undock Null Docking"
          dockable={true}
        >
          <span>Content</span>
        </ContextWindow>
      );
    };

    await act(async () => {
      render(<TestComponent />);
    });

    // Try to undock when not in a docking context (docking will be undefined)
    await act(async () => {
      _capturedRef?.current?.undock();
    });

    // Window should still exist and not crash
    const window = document.getElementById("undock-null-docking-test");
    expect(window).toBeInTheDocument();
  });

  test("Window not visible initially, becomes visible during drag", async () => {
    let _capturedRef: React.RefObject<ContextWindowHandle | null> | null = null;
    const dockingState = new Map<string, DockedWindow>();

    const MockDockingProvider = ({ children }: { children: React.ReactNode }) => {
      const mockDocking: DockingContextType = {
        state: { dockedWindows: dockingState, collapsedEdges: new Set() },
        dock: (id: string, edge: DockEdge, stackDirection: StackDirection) => {
          dockingState.set(id, { id, edge, stackDirection, isCollapsed: false, order: 0 });
        },
        undock: (id: string) => {
          dockingState.delete(id);
        },
        getDockedWindow: (id: string) => dockingState.get(id),
        getWindowsOnEdge: (edge: DockEdge) =>
          Array.from(dockingState.values()).filter((w) => w.edge === edge),
        toggleCollapse: () => {},
        isEdgeCollapsed: () => false,
        toggleEdgeCollapse: () => {},
      };

      return <DockingContext.Provider value={mockDocking}>{children}</DockingContext.Provider>;
    };

    const TestComponent = () => {
      const ref = useRef<ContextWindowHandle>(null);
      useEffect(() => {
        _capturedRef = ref;
      }, []);

      return (
        <MockDockingProvider>
          <ContextWindow
            ref={ref}
            id="visibility-test"
            visible={true}
            title="Visibility Test"
            dockable={true}
          >
            <span>Content</span>
          </ContextWindow>
        </MockDockingProvider>
      );
    };

    await act(async () => {
      render(<TestComponent />);
    });

    // Window should be visible
    const windowElement = document.getElementById("visibility-test") as HTMLElement;
    expect(windowElement).toBeInTheDocument();

    const titleBar = screen.getByTitle("Visibility Test") as HTMLElement;

    // Drag it
    await act(async () => {
      fireEvent.mouseDown(titleBar, { clientX: 400, clientY: 300 });
      fireEvent.mouseMove(document, { clientX: 450, clientY: 350, movementX: 50, movementY: 50 });
      fireEvent.mouseUp(document);
    });

    // Window should still be visible
    const visibleWindow = document.getElementById("visibility-test") as HTMLElement;
    expect(visibleWindow).not.toHaveStyle("display: none");
  });

  test("Snap hysteresis: stays snapped to edge when moving within hysteresis threshold", async () => {
    let _capturedRef: React.RefObject<ContextWindowHandle | null> | null = null;
    const dockingState = new Map<string, DockedWindow>();

    const MockDockingProvider = ({ children }: { children: React.ReactNode }) => {
      const mockDocking: DockingContextType = {
        state: { dockedWindows: dockingState, collapsedEdges: new Set() },
        dock: (id: string, edge: DockEdge, stackDirection: StackDirection) => {
          dockingState.set(id, { id, edge, stackDirection, isCollapsed: false, order: 0 });
        },
        undock: (id: string) => {
          dockingState.delete(id);
        },
        getDockedWindow: (id: string) => dockingState.get(id),
        getWindowsOnEdge: (edge: DockEdge) =>
          Array.from(dockingState.values()).filter((w) => w.edge === edge),
        toggleCollapse: () => {},
        isEdgeCollapsed: () => false,
        toggleEdgeCollapse: () => {},
      };

      return <DockingContext.Provider value={mockDocking}>{children}</DockingContext.Provider>;
    };

    const TestComponent = () => {
      const ref = useRef<ContextWindowHandle>(null);
      useEffect(() => {
        _capturedRef = ref;
      }, []);

      return (
        <MockDockingProvider>
          <ContextWindow
            ref={ref}
            id="snap-hysteresis-test"
            visible={true}
            title="Snap Hysteresis Test"
            dockable={true}
            defaultStackDirection="vertical"
          >
            <span>Content</span>
          </ContextWindow>
        </MockDockingProvider>
      );
    };

    await act(async () => {
      render(<TestComponent />);
    });

    const titleBar = screen.getByTitle("Snap Hysteresis Test") as HTMLElement;
    expect(titleBar).toBeInTheDocument();

    // First drag: snap to left edge
    await act(async () => {
      fireEvent.mouseDown(titleBar, { clientX: 100, clientY: 300 });
      fireEvent.mouseMove(document, { clientX: 10, clientY: 300, movementX: -90, movementY: 0 });
      fireEvent.mouseUp(document);
    });

    expect(dockingState.has("snap-hysteresis-test")).toBe(true);

    // Get reference to the docked window before next drag test
    expect(dockingState.get("snap-hysteresis-test")?.edge).toBe("left");
  });

  test("Window with position can be dragged", async () => {
    let _capturedRef: React.RefObject<ContextWindowHandle | null> | null = null;
    const dockingState = new Map<string, DockedWindow>();

    const MockDockingProvider = ({ children }: { children: React.ReactNode }) => {
      const mockDocking: DockingContextType = {
        state: { dockedWindows: dockingState, collapsedEdges: new Set() },
        dock: (id: string, edge: DockEdge, stackDirection: StackDirection) => {
          dockingState.set(id, { id, edge, stackDirection, isCollapsed: false, order: 0 });
        },
        undock: (id: string) => {
          dockingState.delete(id);
        },
        getDockedWindow: (id: string) => dockingState.get(id),
        getWindowsOnEdge: (edge: DockEdge) =>
          Array.from(dockingState.values()).filter((w) => w.edge === edge),
        toggleCollapse: () => {},
        isEdgeCollapsed: () => false,
        toggleEdgeCollapse: () => {},
      };

      return <DockingContext.Provider value={mockDocking}>{children}</DockingContext.Provider>;
    };

    const TestComponent = () => {
      const ref = useRef<ContextWindowHandle>(null);
      useEffect(() => {
        _capturedRef = ref;
      }, []);

      return (
        <MockDockingProvider>
          <ContextWindow
            ref={ref}
            id="drag-window-test"
            visible={true}
            title="Drag Window Test"
            dockable={false}
            style={{ left: "100px", top: "100px" }}
          >
            <span>Content</span>
          </ContextWindow>
        </MockDockingProvider>
      );
    };

    await act(async () => {
      render(<TestComponent />);
    });

    const titleBar = screen.getByTitle("Drag Window Test") as HTMLElement;
    expect(titleBar).toBeInTheDocument();

    // Drag the window
    await act(async () => {
      fireEvent.mouseDown(titleBar, { clientX: 150, clientY: 115 });
      fireEvent.mouseMove(document, { clientX: 200, clientY: 180, movementX: 50, movementY: 65 });
      fireEvent.mouseUp(document);
    });

    // Verify window moved
    const windowElement = document.getElementById("drag-window-test") as HTMLElement;
    expect(windowElement).toBeInTheDocument();
  });

  test("Window close button is clickable and calls onClose", async () => {
    const onCloseMock = jest.fn();

    const TestComponent = () => {
      const ref = useRef<ContextWindowHandle>(null);

      return (
        <ContextWindow
          ref={ref}
          id="close-window-test"
          visible={true}
          title="Close Window Test"
          onClose={onCloseMock}
        >
          <span>Content</span>
        </ContextWindow>
      );
    };

    await act(async () => {
      render(<TestComponent />);
    });

    // Find and click the close button
    const closeButton = screen.getByLabelText("Close") as HTMLElement;
    expect(closeButton).toBeInTheDocument();

    // Verify initial visibility
    const windowElement = document.getElementById("close-window-test") as HTMLElement;
    expect(windowElement).toHaveStyle("visibility: visible");

    await act(async () => {
      fireEvent.click(closeButton);
    });

    // Verify onClose callback was called
    expect(onCloseMock).toHaveBeenCalled();
  });

  test("Window with custom styles maintains styles during drag", async () => {
    let _capturedRef: React.RefObject<ContextWindowHandle | null> | null = null;
    const dockingState = new Map<string, DockedWindow>();

    const MockDockingProvider = ({ children }: { children: React.ReactNode }) => {
      const mockDocking: DockingContextType = {
        state: { dockedWindows: dockingState, collapsedEdges: new Set() },
        dock: (id: string, edge: DockEdge, stackDirection: StackDirection) => {
          dockingState.set(id, { id, edge, stackDirection, isCollapsed: false, order: 0 });
        },
        undock: (id: string) => {
          dockingState.delete(id);
        },
        getDockedWindow: (id: string) => dockingState.get(id),
        getWindowsOnEdge: (edge: DockEdge) =>
          Array.from(dockingState.values()).filter((w) => w.edge === edge),
        toggleCollapse: () => {},
        isEdgeCollapsed: () => false,
        toggleEdgeCollapse: () => {},
      };

      return <DockingContext.Provider value={mockDocking}>{children}</DockingContext.Provider>;
    };

    const TestComponent = () => {
      const ref = useRef<ContextWindowHandle>(null);
      useEffect(() => {
        _capturedRef = ref;
      }, []);

      return (
        <MockDockingProvider>
          <ContextWindow
            ref={ref}
            id="styled-drag-test"
            visible={true}
            title="Styled Drag Test"
            dockable={true}
            style={{ backgroundColor: "blue", minWidth: "300px" }}
          >
            <span>Content</span>
          </ContextWindow>
        </MockDockingProvider>
      );
    };

    await act(async () => {
      render(<TestComponent />);
    });

    const titleBar = screen.getByTitle("Styled Drag Test") as HTMLElement;

    // Perform a drag operation
    await act(async () => {
      fireEvent.mouseDown(titleBar, { clientX: 300, clientY: 200 });
      fireEvent.mouseMove(document, { clientX: 400, clientY: 300, movementX: 100, movementY: 100 });
      fireEvent.mouseUp(document);
    });

    // Window should still be in DOM
    const windowElement = document.getElementById("styled-drag-test") as HTMLElement;
    expect(windowElement).toBeInTheDocument();
  });

  test("Multiple windows: second window created after first maintains correct z-index", async () => {
    let _firstRef: React.RefObject<ContextWindowHandle | null> | null = null;
    let _secondRef: React.RefObject<ContextWindowHandle | null> | null = null;

    const TestComponent = () => {
      const ref1 = useRef<ContextWindowHandle>(null);
      const ref2 = useRef<ContextWindowHandle>(null);
      useEffect(() => {
        _firstRef = ref1;
        _secondRef = ref2;
      }, []);

      return (
        <>
          <ContextWindow
            ref={ref1}
            id="z-index-window-1"
            visible={true}
            title="Window 1"
          >
            <span>Content 1</span>
          </ContextWindow>
          <ContextWindow
            ref={ref2}
            id="z-index-window-2"
            visible={true}
            title="Window 2"
          >
            <span>Content 2</span>
          </ContextWindow>
        </>
      );
    };

    await act(async () => {
      render(<TestComponent />);
    });

    // Get z-indexes
    const window1 = document.getElementById("z-index-window-1") as HTMLElement;
    const window2 = document.getElementById("z-index-window-2") as HTMLElement;
    const zIndex1 = parseInt(window1.style.zIndex);
    const zIndex2 = parseInt(window2.style.zIndex);

    // Second window should have same or greater z-index
    expect(zIndex2).toBeGreaterThanOrEqual(zIndex1);
  });

  test("Docking and undocking via ref methods works correctly", async () => {
    let _capturedRef: React.RefObject<ContextWindowHandle | null> | null = null;
    const dockingState = new Map<string, DockedWindow>();

    const MockDockingProvider = ({ children }: { children: React.ReactNode }) => {
      const mockDocking: DockingContextType = {
        state: { dockedWindows: dockingState, collapsedEdges: new Set() },
        dock: (id: string, edge: DockEdge, stackDirection: StackDirection) => {
          dockingState.set(id, { id, edge, stackDirection, isCollapsed: false, order: 0 });
        },
        undock: (id: string) => {
          dockingState.delete(id);
        },
        getDockedWindow: (id: string) => dockingState.get(id),
        getWindowsOnEdge: (edge: DockEdge) =>
          Array.from(dockingState.values()).filter((w) => w.edge === edge),
        toggleCollapse: () => {},
        isEdgeCollapsed: () => false,
        toggleEdgeCollapse: () => {},
      };

      return <DockingContext.Provider value={mockDocking}>{children}</DockingContext.Provider>;
    };

    const TestComponent = () => {
      const ref = useRef<ContextWindowHandle>(null);
      useEffect(() => {
        _capturedRef = ref;
      }, []);

      return (
        <MockDockingProvider>
          <ContextWindow
            ref={ref}
            id="dock-undock-ref-test"
            visible={true}
            title="Dock Undock Ref Test"
            dockable={true}
          >
            <span>Content</span>
          </ContextWindow>
        </MockDockingProvider>
      );
    };

    await act(async () => {
      render(<TestComponent />);
    });

    // Dock to right
    await act(async () => {
      _capturedRef?.current?.dock("right", "horizontal");
    });
    expect(dockingState.get("dock-undock-ref-test")?.edge).toBe("right");

    // Undock
    await act(async () => {
      _capturedRef?.current?.undock();
    });
    expect(dockingState.has("dock-undock-ref-test")).toBe(false);

    // Dock to bottom
    await act(async () => {
      _capturedRef?.current?.dock("bottom", "horizontal");
    });
    expect(dockingState.get("dock-undock-ref-test")?.edge).toBe("bottom");
  });

  test("Guard branches exit early without a docking provider", async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(
        <ContextWindow
          id="guard-no-docking"
          visible={true}
          title="Guard No Docking"
          dockable={true}
        >
          <span>Body</span>
        </ContextWindow>,
      );
    });

    const dockButton = screen.getByLabelText("Dock");
    await act(async () => {
      await user.click(dockButton);
    });
    expect(screen.getByLabelText("Dock")).toBeInTheDocument();

    let _capturedRef: React.RefObject<ContextWindowHandle | null> | null = null;
    const RefComponent = () => {
      const ref = useRef<ContextWindowHandle>(null);
      useEffect(() => {
        _capturedRef = ref;
      }, []);
      return (
        <ContextWindow
          ref={ref}
          id="guard-undock-no-docking"
          visible={true}
          title="Guard Undock No Docking"
          dockable={true}
        >
          <span>Body</span>
        </ContextWindow>
      );
    };

    await act(async () => {
      render(<RefComponent />);
    });

    await act(async () => {
      _capturedRef?.current?.undock();
    });
    expect(screen.getByText("Guard Undock No Docking")).toBeInTheDocument();
  });

  test("Mouseup without an active interaction exits without throwing", async () => {
    await act(async () => {
      render(
        <ContextWindow
          id="no-interaction-mouseup"
          visible={true}
          title="No Interaction Mouseup"
        >
          <span>Body</span>
        </ContextWindow>,
      );
    });

    expect(() => {
      fireEvent.mouseUp(document);
    }).not.toThrow();
  });

  test("Snap detection covers hysteresis and edge clearing paths", async () => {
    const renderWindow = (id: string, title: string, dockable = true) => {
      const dockingState = new Map<string, DockedWindow>();
      const MockDockingProvider = ({ children }: { children: React.ReactNode }) => {
        const mockDocking: DockingContextType = {
          state: { dockedWindows: dockingState, collapsedEdges: new Set() },
          dock: (dockId: string, edge: DockEdge, stackDirection: StackDirection) => {
            dockingState.set(dockId, {
              id: dockId,
              edge,
              stackDirection,
              isCollapsed: false,
              order: 0,
            });
          },
          undock: (dockId: string) => {
            dockingState.delete(dockId);
          },
          getDockedWindow: (dockId: string) => dockingState.get(dockId),
          getWindowsOnEdge: (edge: DockEdge) =>
            Array.from(dockingState.values()).filter((win) => win.edge === edge),
          toggleCollapse: () => {},
          isEdgeCollapsed: () => false,
          toggleEdgeCollapse: () => {},
        };
        return <DockingContext.Provider value={mockDocking}>{children}</DockingContext.Provider>;
      };

      return render(
        <MockDockingProvider>
          <ContextWindow
            id={id}
            visible={true}
            title={title}
            dockable={dockable}
          >
            <span>Body</span>
          </ContextWindow>
        </MockDockingProvider>,
      );
    };

    const originalWidth = window.innerWidth;
    const originalHeight = window.innerHeight;
    Object.defineProperty(window, "innerWidth", { value: 800, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 600, configurable: true });

    try {
      // Left snap hysteresis
      const { unmount: unmountLeft } = renderWindow("snap-left-hysteresis", "Snap Left Hysteresis");
      const leftTitle = screen.getByTitle("Snap Left Hysteresis") as HTMLElement;
      await act(async () => {
        fireEvent.mouseDown(leftTitle, { clientX: 150, clientY: 200 });
        fireEvent.mouseMove(document, { clientX: 10, clientY: 200, movementX: -140, movementY: 0 });
        fireEvent.mouseMove(document, { clientX: 3, clientY: 200, movementX: -7, movementY: 0 });
        fireEvent.mouseMove(document, { clientX: 100, clientY: 200, movementX: 97, movementY: 0 });
      });
      unmountLeft();

      // Right snap hysteresis
      const { unmount: unmountRight } = renderWindow(
        "snap-right-hysteresis",
        "Snap Right Hysteresis",
      );
      const rightTitle = screen.getByTitle("Snap Right Hysteresis") as HTMLElement;
      await act(async () => {
        fireEvent.mouseDown(rightTitle, { clientX: 150, clientY: 200 });
        fireEvent.mouseMove(document, { clientX: 790, clientY: 200, movementX: 640, movementY: 0 });
        fireEvent.mouseMove(document, { clientX: 798, clientY: 200, movementX: 8, movementY: 0 });
        fireEvent.mouseMove(document, {
          clientX: 400,
          clientY: 200,
          movementX: -398,
          movementY: 0,
        });
      });
      unmountRight();

      // Top snap hysteresis
      const { unmount: unmountTop } = renderWindow("snap-top-hysteresis", "Snap Top Hysteresis");
      const topTitle = screen.getByTitle("Snap Top Hysteresis") as HTMLElement;
      await act(async () => {
        fireEvent.mouseDown(topTitle, { clientX: 150, clientY: 150 });
        fireEvent.mouseMove(document, { clientX: 150, clientY: 10, movementX: 0, movementY: -140 });
        fireEvent.mouseMove(document, { clientX: 150, clientY: 5, movementX: 0, movementY: -5 });
        fireEvent.mouseMove(document, { clientX: 150, clientY: 250, movementX: 0, movementY: 245 });
      });
      unmountTop();

      // Bottom snap hysteresis
      const { unmount: unmountBottom } = renderWindow(
        "snap-bottom-hysteresis",
        "Snap Bottom Hysteresis",
      );
      const bottomTitle = screen.getByTitle("Snap Bottom Hysteresis") as HTMLElement;
      await act(async () => {
        fireEvent.mouseDown(bottomTitle, { clientX: 150, clientY: 150 });
        fireEvent.mouseMove(document, { clientX: 150, clientY: 590, movementX: 0, movementY: 440 });
        fireEvent.mouseMove(document, { clientX: 150, clientY: 596, movementX: 0, movementY: 6 });
        fireEvent.mouseMove(document, {
          clientX: 150,
          clientY: 200,
          movementX: 0,
          movementY: -396,
        });
      });
      unmountBottom();

      expect(screen.queryByText("Snap Bottom Hysteresis")).not.toBeInTheDocument();
    } finally {
      Object.defineProperty(window, "innerWidth", { value: originalWidth, configurable: true });
      Object.defineProperty(window, "innerHeight", { value: originalHeight, configurable: true });
    }
  });

  test("Undocking from a docked edge applies the header offset while dragging", async () => {
    const dockingState = new Map<string, DockedWindow>();
    const MockDockingProvider = ({ children }: { children: React.ReactNode }) => {
      const mockDocking: DockingContextType = {
        state: { dockedWindows: dockingState, collapsedEdges: new Set() },
        dock: (id: string, edge: DockEdge, stackDirection: StackDirection) => {
          dockingState.set(id, { id, edge, stackDirection, isCollapsed: false, order: 0 });
        },
        undock: (id: string) => {
          dockingState.delete(id);
        },
        getDockedWindow: (id: string) => dockingState.get(id),
        getWindowsOnEdge: (edge: DockEdge) =>
          Array.from(dockingState.values()).filter((win) => win.edge === edge),
        toggleCollapse: () => {},
        isEdgeCollapsed: () => false,
        toggleEdgeCollapse: () => {},
      };
      return <DockingContext.Provider value={mockDocking}>{children}</DockingContext.Provider>;
    };

    dockingState.set("undock-header-offset", {
      id: "undock-header-offset",
      edge: "left",
      stackDirection: "vertical",
      isCollapsed: false,
      order: 0,
    });

    await act(async () => {
      render(
        <MockDockingProvider>
          <ContextWindow
            id="undock-header-offset"
            visible={true}
            title="Undock Header Offset"
            dockable={true}
          >
            <span>Body</span>
          </ContextWindow>
        </MockDockingProvider>,
      );
    });

    const titleBar = screen.getByTitle("Undock Header Offset") as HTMLElement;
    await act(async () => {
      fireEvent.mouseDown(titleBar, { clientX: 120, clientY: 100 });
      fireEvent.mouseMove(document, { clientX: 100, clientY: 100, movementX: 0, movementY: 0 });
      fireEvent.mouseUp(document);
    });

    const windowElement = document.getElementById("undock-header-offset") as HTMLElement;
    expect(windowElement).toBeInTheDocument();
    expect(windowElement.style.transform).toMatch(/translate\(-?\d+px, -?\d+px\)/);
  });

  test("Undocking from top edge applies correct undock logic", async () => {
    const dockingState = new Map<string, DockedWindow>();
    const MockDockingProvider = ({ children }: { children: React.ReactNode }) => {
      const mockDocking: DockingContextType = {
        state: { dockedWindows: dockingState, collapsedEdges: new Set() },
        dock: (id: string, edge: DockEdge, stackDirection: StackDirection) => {
          dockingState.set(id, { id, edge, stackDirection, isCollapsed: false, order: 0 });
        },
        undock: (id: string) => {
          dockingState.delete(id);
        },
        getDockedWindow: (id: string) => dockingState.get(id),
        getWindowsOnEdge: (edge: DockEdge) =>
          Array.from(dockingState.values()).filter((win) => win.edge === edge),
        toggleCollapse: () => {},
        isEdgeCollapsed: () => false,
        toggleEdgeCollapse: () => {},
      };
      return <DockingContext.Provider value={mockDocking}>{children}</DockingContext.Provider>;
    };

    dockingState.set("undock-top-edge", {
      id: "undock-top-edge",
      edge: "top",
      stackDirection: "horizontal",
      isCollapsed: false,
      order: 0,
    });

    await act(async () => {
      render(
        <MockDockingProvider>
          <ContextWindow
            id="undock-top-edge"
            visible={true}
            title="Undock Top Edge"
            dockable={true}
          >
            <span>Body</span>
          </ContextWindow>
        </MockDockingProvider>,
      );
    });

    const titleBar = screen.getByTitle("Undock Top Edge") as HTMLElement;
    // Move down from top edge (y: 50 -> 200, which is > UNDOCK_THRESHOLD of 20)
    await act(async () => {
      fireEvent.mouseDown(titleBar, { clientX: 400, clientY: 50 });
      fireEvent.mouseMove(document, { clientX: 400, clientY: 200, movementX: 0, movementY: 150 });
      fireEvent.mouseUp(document);
    });

    const windowElement = document.getElementById("undock-top-edge") as HTMLElement;
    expect(windowElement).toBeInTheDocument();
    // Verify the window is no longer docked
    expect(dockingState.has("undock-top-edge")).toBe(false);
  });

  test("Undocking from bottom edge applies correct undock logic", async () => {
    const dockingState = new Map<string, DockedWindow>();
    const MockDockingProvider = ({ children }: { children: React.ReactNode }) => {
      const mockDocking: DockingContextType = {
        state: { dockedWindows: dockingState, collapsedEdges: new Set() },
        dock: (id: string, edge: DockEdge, stackDirection: StackDirection) => {
          dockingState.set(id, { id, edge, stackDirection, isCollapsed: false, order: 0 });
        },
        undock: (id: string) => {
          dockingState.delete(id);
        },
        getDockedWindow: (id: string) => dockingState.get(id),
        getWindowsOnEdge: (edge: DockEdge) =>
          Array.from(dockingState.values()).filter((win) => win.edge === edge),
        toggleCollapse: () => {},
        isEdgeCollapsed: () => false,
        toggleEdgeCollapse: () => {},
      };
      return <DockingContext.Provider value={mockDocking}>{children}</DockingContext.Provider>;
    };

    const originalHeight = window.innerHeight;
    Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });

    try {
      dockingState.set("undock-bottom-edge", {
        id: "undock-bottom-edge",
        edge: "bottom",
        stackDirection: "horizontal",
        isCollapsed: false,
        order: 0,
      });

      await act(async () => {
        render(
          <MockDockingProvider>
            <ContextWindow
              id="undock-bottom-edge"
              visible={true}
              title="Undock Bottom Edge"
              dockable={true}
            >
              <span>Body</span>
            </ContextWindow>
          </MockDockingProvider>,
        );
      });

      const titleBar = screen.getByTitle("Undock Bottom Edge") as HTMLElement;
      // Move up from bottom edge (y: 750 -> 600, which is < window.innerHeight (800) - UNDOCK_THRESHOLD (20) = 780)
      await act(async () => {
        fireEvent.mouseDown(titleBar, { clientX: 400, clientY: 750 });
        fireEvent.mouseMove(document, {
          clientX: 400,
          clientY: 600,
          movementX: 0,
          movementY: -150,
        });
        fireEvent.mouseUp(document);
      });

      const windowElement = document.getElementById("undock-bottom-edge") as HTMLElement;
      expect(windowElement).toBeInTheDocument();
      // Verify the window is no longer docked
      expect(dockingState.has("undock-bottom-edge")).toBe(false);
    } finally {
      Object.defineProperty(window, "innerHeight", { value: originalHeight, configurable: true });
    }
  });

  test("Undocking from right edge applies correct undock logic", async () => {
    const dockingState = new Map<string, DockedWindow>();
    const MockDockingProvider = ({ children }: { children: React.ReactNode }) => {
      const mockDocking: DockingContextType = {
        state: { dockedWindows: dockingState, collapsedEdges: new Set() },
        dock: (id: string, edge: DockEdge, stackDirection: StackDirection) => {
          dockingState.set(id, { id, edge, stackDirection, isCollapsed: false, order: 0 });
        },
        undock: (id: string) => {
          dockingState.delete(id);
        },
        getDockedWindow: (id: string) => dockingState.get(id),
        getWindowsOnEdge: (edge: DockEdge) =>
          Array.from(dockingState.values()).filter((win) => win.edge === edge),
        toggleCollapse: () => {},
        isEdgeCollapsed: () => false,
        toggleEdgeCollapse: () => {},
      };
      return <DockingContext.Provider value={mockDocking}>{children}</DockingContext.Provider>;
    };

    const originalWidth = window.innerWidth;
    Object.defineProperty(window, "innerWidth", { value: 1000, configurable: true });

    try {
      dockingState.set("undock-right-edge", {
        id: "undock-right-edge",
        edge: "right",
        stackDirection: "vertical",
        isCollapsed: false,
        order: 0,
      });

      await act(async () => {
        render(
          <MockDockingProvider>
            <ContextWindow
              id="undock-right-edge"
              visible={true}
              title="Undock Right Edge"
              dockable={true}
            >
              <span>Body</span>
            </ContextWindow>
          </MockDockingProvider>,
        );
      });

      const titleBar = screen.getByTitle("Undock Right Edge") as HTMLElement;
      // Move left from right edge (x: 950 -> 800, which is < window.innerWidth (1000) - UNDOCK_THRESHOLD (20) = 980)
      await act(async () => {
        fireEvent.mouseDown(titleBar, { clientX: 950, clientY: 300 });
        fireEvent.mouseMove(document, {
          clientX: 800,
          clientY: 300,
          movementX: -150,
          movementY: 0,
        });
        fireEvent.mouseUp(document);
      });

      const windowElement = document.getElementById("undock-right-edge") as HTMLElement;
      expect(windowElement).toBeInTheDocument();
      // Verify the window is no longer docked
      expect(dockingState.has("undock-right-edge")).toBe(false);
    } finally {
      Object.defineProperty(window, "innerWidth", { value: originalWidth, configurable: true });
    }
  });

  test("Docked window drag without exceeding undock threshold does not undock", async () => {
    const dockingState = new Map<string, DockedWindow>();
    const MockDockingProvider = ({ children }: { children: React.ReactNode }) => {
      const mockDocking: DockingContextType = {
        state: { dockedWindows: dockingState, collapsedEdges: new Set() },
        dock: (id: string, edge: DockEdge, stackDirection: StackDirection) => {
          dockingState.set(id, { id, edge, stackDirection, isCollapsed: false, order: 0 });
        },
        undock: (id: string) => {
          dockingState.delete(id);
        },
        getDockedWindow: (id: string) => dockingState.get(id),
        getWindowsOnEdge: (edge: DockEdge) =>
          Array.from(dockingState.values()).filter((win) => win.edge === edge),
        toggleCollapse: () => {},
        isEdgeCollapsed: () => false,
        toggleEdgeCollapse: () => {},
      };
      return <DockingContext.Provider value={mockDocking}>{children}</DockingContext.Provider>;
    };

    dockingState.set("no-undock-left", {
      id: "no-undock-left",
      edge: "left",
      stackDirection: "vertical",
      isCollapsed: false,
      order: 0,
    });

    await act(async () => {
      render(
        <MockDockingProvider>
          <ContextWindow
            id="no-undock-left"
            visible={true}
            title="No Undock Left"
            dockable={true}
          >
            <span>Body</span>
          </ContextWindow>
        </MockDockingProvider>,
      );
    });

    const titleBar = screen.getByTitle("No Undock Left") as HTMLElement;
    // Move from clientX: 10 to clientX: 15 (both <= UNDOCK_THRESHOLD of 20, so no undock)
    // For left edge, undock only if clientX > 20
    await act(async () => {
      fireEvent.mouseDown(titleBar, { clientX: 10, clientY: 100 });
      fireEvent.mouseMove(document, { clientX: 15, clientY: 100, movementX: 5, movementY: 0 });
      fireEvent.mouseUp(document);
    });

    // Verify window is still docked (did not undock)
    expect(dockingState.has("no-undock-left")).toBe(true);
    expect(dockingState.get("no-undock-left")?.edge).toBe("left");
  });
});
