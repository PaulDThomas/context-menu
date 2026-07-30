import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, useRef, useState } from "react";
import { ContextWindow, ContextWindowHandle, MIN_Z_INDEX } from "./ContextWindow";

describe("Context window", () => {
  beforeEach(() => {
    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
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
    global.ResizeObserver = class {
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
    global.ResizeObserver = class {
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
});
