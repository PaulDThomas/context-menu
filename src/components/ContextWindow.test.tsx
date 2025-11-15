import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
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
});
