import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContextWindow } from "./ContextWindow";
import { ContextWindowStack } from "./ContextWindowStack";
import { useState } from "react";

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

  test("WARNING because there is no stack", async () => {
    render(
      <ContextWindow
        id={"w1"}
        visible={true}
        title={"Window title"}
      >
        <span>Hi</span>
      </ContextWindow>,
    );
    expect(screen.queryByText("Window title")).not.toBeInTheDocument();
    expect(screen.queryByText("Hi")).toBeInTheDocument();
    expect(screen.queryByText(/WARNING/)).toBeInTheDocument();
  });

  test("With stack, should be visible, and check close", async () => {
    const user = userEvent.setup();
    const mockClose = jest.fn();
    await act(async () => {
      render(
        <ContextWindowStack>
          <ContextWindow
            id={"w1"}
            visible={true}
            title={"Window title"}
            onClose={mockClose}
          >
            <span>Hi</span>
          </ContextWindow>
        </ContextWindowStack>,
      );
    });
    expect(screen.queryByText("Window title")).toBeInTheDocument();
    const closeCross = screen.queryByLabelText("Close") as Element;
    await act(async () => await user.click(closeCross));
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  test("With stack, not visible", async () => {
    await act(async () => {
      render(
        <ContextWindowStack>
          <ContextWindow
            id={"w1"}
            visible={false}
            title={"Window title"}
          >
            <span>Hi</span>
          </ContextWindow>
        </ContextWindowStack>,
      );
    });
    const title = screen.queryByText("Window title") as HTMLSpanElement;
    expect(title).not.toBeInTheDocument();
  });

  test("Move the mouse, turn it on and off", async () => {
    const WindowWithInput = (): JSX.Element => {
      const [visible, setVisible] = useState<boolean>(false);
      return (
        <ContextWindowStack>
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
        </ContextWindowStack>
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
      <ContextWindowStack>
        <ContextWindow
          id={"testwindow"}
          visible={true}
          title={"Test window"}
          titleElement={<>Window that is a test</>}
        >
          <span>Hello world of tests</span>
        </ContextWindow>
      </ContextWindowStack>,
    );
    expect(screen.queryByText("Window that is a test")).toBeInTheDocument();
  });

  test("Window with onOpen callback", async () => {
    const onOpen = jest.fn();
    await act(async () => {
      render(
        <ContextWindowStack>
          <ContextWindow
            id={"testwindow"}
            visible={true}
            title={"Test window"}
            onOpen={onOpen}
          >
            <span>Hello world of tests</span>
          </ContextWindow>
        </ContextWindowStack>,
      );
    });
    expect(onOpen).toHaveBeenCalled();
  });

  test("Window with empty title", async () => {
    const user = userEvent.setup();
    const mockClose = jest.fn();
    await act(async () => {
      render(
        <ContextWindowStack>
          <ContextWindow
            id={"w1"}
            visible={true}
            title={""}
            onClose={mockClose}
          >
            <span>Hi</span>
          </ContextWindow>
        </ContextWindowStack>,
      );
    });
    const closeCross = screen.queryByLabelText("Close") as Element;
    expect(closeCross).toHaveAttribute("title", "Close window");
    await act(async () => await user.click(closeCross));
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  test("Window with custom styles", async () => {
    await act(async () => {
      render(
        <ContextWindowStack>
          <ContextWindow
            id={"testwindow"}
            visible={true}
            title={"Test window"}
            style={{
              minHeight: "200px",
              minWidth: "300px",
              maxHeight: "800px",
              maxWidth: "900px",
            }}
          >
            <span>Hello world of tests</span>
          </ContextWindow>
        </ContextWindowStack>,
      );
    });
    const windowTitle = screen.getByText("Test window");
    const windowRoot = windowTitle.closest("#testwindow") as HTMLDivElement;
    expect(windowRoot).toHaveStyle({ minHeight: "200px" });
    expect(windowRoot).toHaveStyle({ minWidth: "300px" });
    expect(windowRoot).toHaveStyle({ maxHeight: "800px" });
    expect(windowRoot).toHaveStyle({ maxWidth: "900px" });
  });

  test("Window with onClickCapture callback", async () => {
    const user = userEvent.setup();
    const onClickCapture = jest.fn();
    await act(async () => {
      render(
        <ContextWindowStack>
          <ContextWindow
            id={"testwindow"}
            visible={true}
            title={"Test window"}
            onClickCapture={onClickCapture}
          >
            <span>Hello world of tests</span>
          </ContextWindow>
        </ContextWindowStack>,
      );
    });
    const windowBody = screen.getByText("Hello world of tests");
    await act(async () => await user.click(windowBody));
    expect(onClickCapture).toHaveBeenCalled();
  });

  test("Mouse up on SVGElement target", async () => {
    await act(async () => {
      render(
        <ContextWindowStack>
          <ContextWindow
            id={"testwindow"}
            visible={true}
            title={"Test window"}
            style={{
              transition: "opacity 0s linear",
            }}
          >
            <span>Hello world of tests</span>
          </ContextWindow>
        </ContextWindowStack>,
      );
    });
    const title = screen.queryByText("Test window") as HTMLSpanElement;
    expect(title).toBeVisible();
    const closeButton = screen.getByLabelText("Close");
    const svg = closeButton.querySelector("svg") as SVGSVGElement;
    fireEvent.mouseDown(title);
    fireEvent.mouseMove(title, { movementX: 10, movementY: 10 });
    fireEvent.mouseUp(svg);
  });

  test("Mouse down on SVGElement target", async () => {
    await act(async () => {
      render(
        <ContextWindowStack>
          <ContextWindow
            id={"testwindow"}
            visible={true}
            title={"Test window"}
            style={{
              transition: "opacity 0s linear",
            }}
          >
            <span>Hello world of tests</span>
          </ContextWindow>
        </ContextWindowStack>,
      );
    });
    const closeButton = screen.getByLabelText("Close");
    const svg = closeButton.querySelector("svg") as SVGSVGElement;
    fireEvent.mouseDown(svg);
    fireEvent.mouseMove(svg, { movementX: 10, movementY: 10 });
    fireEvent.mouseUp(svg);
  });

  test("Window positioning when not enough space below", async () => {
    // Mock window.innerHeight to simulate a small viewport
    const originalInnerHeight = window.innerHeight;
    Object.defineProperty(window, "innerHeight", {
      writable: true,
      configurable: true,
      value: 50,
    });

    // Mock getBoundingClientRect to simulate a position where window would overflow
    const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = jest.fn(function (this: Element) {
      if (this.getAttribute("aria-label") === "testwindow-checkbox") {
        // Parent position near bottom of viewport
        return {
          top: 40,
          bottom: 45,
          left: 10,
          right: 100,
          width: 90,
          height: 5,
          x: 10,
          y: 40,
          toJSON: () => ({}),
        } as DOMRect;
      }
      if (this.id === "testwindow") {
        // Window with height that would overflow
        return {
          top: 45,
          bottom: 145,
          left: 10,
          right: 110,
          width: 100,
          height: 100,
          x: 10,
          y: 45,
          toJSON: () => ({}),
        } as DOMRect;
      }
      return originalGetBoundingClientRect.call(this);
    });

    const WindowWithInput = (): JSX.Element => {
      const [visible, setVisible] = useState<boolean>(false);
      return (
        <ContextWindowStack>
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
        </ContextWindowStack>
      );
    };

    const user = userEvent.setup();
    await act(async () => {
      render(<WindowWithInput />);
    });
    const chk = screen.queryByLabelText("testwindow-checkbox") as HTMLInputElement;
    await act(async () => await user.click(chk));
    expect(screen.queryByText("Test window")).toBeVisible();

    // Cleanup
    Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    Object.defineProperty(window, "innerHeight", {
      writable: true,
      configurable: true,
      value: originalInnerHeight,
    });
  });
});
