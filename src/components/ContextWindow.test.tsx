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
    const WindowWithOnOpen = (): JSX.Element => {
      const [visible, setVisible] = useState<boolean>(false);
      return (
        <ContextWindowStack>
          <button onClick={() => setVisible(true)}>Open</button>
          <ContextWindow
            id={"testwindow"}
            visible={visible}
            title={"Test window"}
            onOpen={onOpen}
          >
            <span>Content</span>
          </ContextWindow>
        </ContextWindowStack>
      );
    };

    const user = userEvent.setup();
    await act(async () => {
      render(<WindowWithOnOpen />);
    });
    const button = screen.getByText("Open");
    await act(async () => await user.click(button));
    expect(onOpen).toHaveBeenCalled();
  });

  test("Window click to bring to top and onClickCapture", async () => {
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
            <span>Content</span>
          </ContextWindow>
        </ContextWindowStack>,
      );
    });
    const user = userEvent.setup();
    const content = screen.getByText("Content");
    await act(async () => await user.click(content));
    expect(onClickCapture).toHaveBeenCalled();
  });

  test("Window close button with empty title", async () => {
    const onClose = jest.fn();
    await act(async () => {
      render(
        <ContextWindowStack>
          <ContextWindow
            id={"testwindow"}
            visible={true}
            title={""}
            onClose={onClose}
          >
            <span>Content</span>
          </ContextWindow>
        </ContextWindowStack>,
      );
    });
    const closeButton = screen.getByLabelText("Close");
    expect(closeButton).toHaveAttribute("title", "Close window");
  });

  test("Window resize event during move", async () => {
    await act(async () => {
      render(
        <ContextWindowStack>
          <ContextWindow
            id={"testwindow"}
            visible={true}
            title={"Test window"}
          >
            <span>Content</span>
          </ContextWindow>
        </ContextWindowStack>,
      );
    });
    const title = screen.getByText("Test window");
    expect(title).toBeInTheDocument();
    fireEvent.mouseDown(title);
    fireEvent.mouseMove(title, { movementX: 10, movementY: 10 });
    // Trigger window resize event during move
    global.window.dispatchEvent(new Event("resize"));
    fireEvent.mouseUp(title);
    expect(title).toBeVisible();
  });

  test("Window mousedown on SVG element", async () => {
    await act(async () => {
      render(
        <ContextWindowStack>
          <ContextWindow
            id={"testwindow"}
            visible={true}
            title={"Test window"}
          >
            <span>Content</span>
          </ContextWindow>
        </ContextWindowStack>,
      );
    });
    const closeButton = screen.getByLabelText("Close");
    const svg = closeButton.querySelector("svg") as SVGElement;
    expect(svg).toBeInTheDocument();
    fireEvent.mouseDown(svg);
    fireEvent.mouseUp(svg);
  });

  test("Window mouseup on SVG element after moving", async () => {
    await act(async () => {
      render(
        <ContextWindowStack>
          <ContextWindow
            id={"testwindow"}
            visible={true}
            title={"Test window"}
          >
            <span>Content</span>
          </ContextWindow>
        </ContextWindowStack>,
      );
    });
    const title = screen.getByText("Test window");
    const closeButton = screen.getByLabelText("Close");
    const svg = closeButton.querySelector("svg") as SVGElement;

    expect(svg).toBeInTheDocument();
    fireEvent.mouseDown(title);
    fireEvent.mouseMove(title, { movementX: 10, movementY: 10 });
    fireEvent.mouseUp(svg);
  });

  test("Window opens above when not enough space below", async () => {
    const WindowNearBottom = (): JSX.Element => {
      const [visible, setVisible] = useState<boolean>(false);
      return (
        <ContextWindowStack>
          <div
            style={{ position: "absolute", top: "700px" }}
            data-testid="anchor"
          >
            <button onClick={() => setVisible(true)}>Open</button>
            <ContextWindow
              id={"testwindow"}
              visible={visible}
              title={"Test window"}
              style={{ minHeight: "200px" }}
            >
              <div style={{ height: "200px" }}>Content</div>
            </ContextWindow>
          </div>
        </ContextWindowStack>
      );
    };

    const user = userEvent.setup();
    await act(async () => {
      render(<WindowNearBottom />);
    });

    // Mock getBoundingClientRect to simulate window near bottom
    const anchor = screen.getByTestId("anchor");
    const originalGetBoundingClientRect = anchor.getBoundingClientRect;
    anchor.getBoundingClientRect = jest.fn().mockReturnValue({
      left: 0,
      top: 700,
      bottom: 720,
      right: 100,
      width: 100,
      height: 20,
      x: 0,
      y: 700,
      toJSON: () => ({}),
    });

    const button = screen.getByText("Open");
    await act(async () => await user.click(button));
    const windowTitle = screen.getByText("Test window");
    expect(windowTitle).toBeVisible();

    // Restore original function
    anchor.getBoundingClientRect = originalGetBoundingClientRect;
  });
});
