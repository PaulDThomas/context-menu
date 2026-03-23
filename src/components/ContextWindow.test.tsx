import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    await waitFor(() => {
      expect(document.getElementById("window1")).toBeInTheDocument();
    });
    const window1 = document.getElementById("window1") as HTMLElement;
    const zIndex1 = parseInt(window1.style.zIndex, 10);
    expect(zIndex1).toBeGreaterThanOrEqual(MIN_Z_INDEX);

    // Open second window - should have higher z-index
    const openBtn2 = screen.getByText("Open Window 2");
    await user.click(openBtn2);
    await waitFor(() => {
      expect(document.getElementById("window2")).toBeInTheDocument();
    });
    const window2 = document.getElementById("window2") as HTMLElement;
    const zIndex2 = parseInt(window2.style.zIndex, 10);
    expect(zIndex2).toBeGreaterThan(zIndex1);

    // Click on first window - should bring it to top
    await user.click(window1);
    await waitFor(() => {
      const zIndex1Updated = parseInt(window1.style.zIndex, 10);
      expect(zIndex1Updated).toBeGreaterThan(zIndex2);
    });
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
    await act(async () => await user.click(win));
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
