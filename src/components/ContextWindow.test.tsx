import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import * as chk from "../functions/chkPosition";
import { ContextWindow } from "./ContextWindow";

describe("Context window", () => {
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

  test("Move the mouse, turn it on and off", async () => {
    const WindowWithInput = (): JSX.Element => {
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
    fireEvent.mouseDown(title);
    fireEvent.mouseMove(title, { movementX: 5000, movementY: -5000 });
    fireEvent.mouseUp(title);
    fireEvent.mouseDown(title);
    fireEvent.mouseMove(title, { movementX: -5000, movementY: 5000 });
    fireEvent.mouseUp(title);
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
    const MultiWindowTest = (): JSX.Element => {
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
    await act(async () => await user.click(openBtn1));
    const window1 = document.getElementById("window1") as HTMLElement;
    expect(window1).toBeInTheDocument();
    const zIndex1 = parseInt(window1.style.zIndex, 10);
    expect(zIndex1).toBeGreaterThanOrEqual(1000);

    // Open second window - should have higher z-index
    const openBtn2 = screen.getByText("Open Window 2");
    await act(async () => await user.click(openBtn2));
    const window2 = document.getElementById("window2") as HTMLElement;
    expect(window2).toBeInTheDocument();
    const zIndex2 = parseInt(window2.style.zIndex, 10);
    expect(zIndex2).toBeGreaterThan(zIndex1);

    // Click on first window - should bring it to top
    await act(async () => await user.click(window1));
    const zIndex1Updated = parseInt(window1.style.zIndex, 10);
    expect(zIndex1Updated).toBeGreaterThan(zIndex2);
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
    expect(zIndex).toBeGreaterThanOrEqual(3000);

    // cleanup added element
    bad.remove();
  });

  test("Mouse down on title sets userSelect none and mouseup restores it", async () => {
    await act(async () => {
      render(
        <ContextWindow
          id={"mouseuser"}
          visible={true}
          title={"Mouse Test"}
        >
          <span>Body</span>
        </ContextWindow>,
      );
    });

    const title = screen.getByTitle("Mouse Test") as HTMLElement;
    expect(title).toBeInTheDocument();

    // mouseDown should set userSelect to none on the target
    fireEvent.mouseDown(title);
    expect(title.style.userSelect).toBe("none");

    // Fire mouseup event on the title which should restore userSelect to auto
    fireEvent.mouseUp(title);
    expect(title.style.userSelect).toBe("auto");
  });

  test("Mouseup on SVG target restores userSelect on SVG element", async () => {
    await act(async () => {
      render(
        <ContextWindow
          id={"svgtarget"}
          visible={true}
          title={"SVG Test"}
        >
          <span>Body</span>
        </ContextWindow>,
      );
    });

    const title = screen.getByTitle("SVG Test") as HTMLElement;
    expect(title).toBeInTheDocument();

    // Start moving (adds document mouseup listener)
    fireEvent.mouseDown(title);

    // Find the SVG element (close icon) and fire mouseup on it
    const svg = document.querySelector("#svgtarget svg") as SVGElement;
    expect(svg).toBeInTheDocument();
    // ensure style exists
    (svg as unknown as HTMLElement).style.userSelect = "none";
    fireEvent.mouseUp(svg as Element);
    // style should be reset to auto by handler
    expect((svg as unknown as HTMLElement).style.userSelect).toBe("auto");
  });

  test("Mouse down on SVG target sets userSelect none (SVG branch)", async () => {
    await act(async () => {
      render(
        <ContextWindow
          id={"svgmousedown"}
          visible={true}
          title={"SVG Down"}
        >
          <span>Body</span>
        </ContextWindow>,
      );
    });

    const svg = document.querySelector("#svgmousedown svg") as SVGElement;
    expect(svg).toBeInTheDocument();
    fireEvent.mouseDown(svg as Element);
    expect((svg as unknown as HTMLElement).style.userSelect).toBe("none");
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

  test("Resize triggers checkPosition and moves the window (mocked chkPosition)", async () => {
    const spy = jest
      .spyOn(chk, "chkPosition")
      .mockImplementation(() => ({ translateX: 12, translateY: 34 }));

    await act(async () => {
      render(
        <ContextWindow
          id={"resizetest"}
          visible={true}
          title={"Resize Test"}
        >
          <span>Body</span>
        </ContextWindow>,
      );
    });

    const win = document.getElementById("resizetest") as HTMLElement;
    expect(win).toBeInTheDocument();

    // trigger mousedown to attach resize listener via onMouseDown
    const title = screen.getByTitle("Resize Test") as HTMLElement;
    fireEvent.mouseDown(title);

    // Trigger resize event - should call our mocked chkPosition and move the window
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });

    // transform should have been applied (at least once)
    expect(win.style.transform).toMatch(/^translate\(\d+px, \d+px\)$/);

    spy.mockRestore();
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
});
