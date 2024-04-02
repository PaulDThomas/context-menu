import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContextWindow } from "./ContextWindow";
import { ContextWindowStack } from "./ContextWindowStack";
import { useState } from "react";

describe("Context menu", () => {
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

  test("Not there because there is no stack", async () => {
    await act(async () => {
      render(
        <ContextWindow
          id={"w1"}
          visible={true}
          title={"Window title"}
        >
          <span>Hi</span>
        </ContextWindow>,
      );
    });
    expect(screen.queryByText("Window title")).not.toBeInTheDocument();
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
    const closeCross = screen.queryByLabelText("Close window") as Element;
    await user.click(closeCross);
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
    await user.click(chk);
    expect(chk).toBeChecked();
    const title = screen.queryByText("Test window") as HTMLSpanElement;
    expect(title).toBeVisible();
    fireEvent.mouseDown(title);
    fireEvent.mouseMove(title, { movementX: 5000, movementY: -5000 });
    fireEvent.mouseUp(title);
    fireEvent.mouseDown(title);
    fireEvent.mouseMove(title, { movementX: -5000, movementY: 5000 });
    fireEvent.mouseUp(title);
    await user.click(chk);
    expect(title).not.toBeVisible();
  });
});
