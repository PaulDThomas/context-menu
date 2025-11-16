import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { menuItems } from "../../__dummy__/mockMenu";
import { ContextMenuHandler } from "./ContextMenuHandler";

describe("Low menu", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const user = userEvent.setup({ delay: null });

  test("Empty render, click action", async () => {
    const a = jest.fn();
    await act(async () =>
      render(
        <ContextMenuHandler
          menuItems={[{ label: "Hello", action: a, group: [] }]}
          showLowMenu
        >
          <div data-testid="inside-div" />
        </ContextMenuHandler>,
      ),
    );
    const testDiv = screen.getByTestId("inside-div");
    fireEvent.mouseEnter(testDiv);
    expect(screen.queryByText("Hello")).toBeInTheDocument();
    const h = screen.getByText("Hello");
    await act(async () => await user.click(h));
    expect(a).toHaveBeenCalled();
    await act(async () => fireEvent.mouseLeave(testDiv));
    expect(screen.queryByText("Hello")?.closest(".lowMenu")).toHaveClass("hidden");
  });

  test("Move the mouse", async () => {
    const setColour = jest.fn();
    await act(async () =>
      render(
        <ContextMenuHandler
          menuItems={menuItems(setColour)}
          showLowMenu
        >
          <div data-testid="inside-div">Inside</div>
          <div data-testid="another-div">Outside</div>
        </ContextMenuHandler>,
      ),
    );
    const testDiv = screen.getByTestId("inside-div");
    await act(async () => {
      fireEvent.mouseEnter(testDiv);
    });

    // Show context submenu
    const lowMenuBlue = screen.queryByLabelText("Blue") as HTMLDivElement;
    expect(lowMenuBlue).toBeVisible();
    fireEvent.mouseEnter(lowMenuBlue);
    const lowMenuBlueSubmenu = screen.queryByLabelText("Sub menu for Blue") as HTMLSpanElement;
    expect(lowMenuBlueSubmenu).toBeVisible();
    expect(screen.queryByLabelText("Cyan")).not.toBeInTheDocument();
    fireEvent.mouseEnter(lowMenuBlueSubmenu);
    const cyan = screen.queryByLabelText("Cyan") as HTMLDivElement;
    expect(cyan.closest(".contextMenu")).toHaveClass("visible");
    await act(async () => {
      fireEvent.mouseLeave(lowMenuBlueSubmenu);
      jest.runAllTimers();
    });
    expect(cyan.closest(".contextMenu")).not.toBeInTheDocument();
    // Fire close event
    fireEvent.mouseEnter(lowMenuBlueSubmenu);
    expect(cyan.closest(".contextMenu")).toHaveClass("visible");
    await act(async () => {
      fireEvent.mouseDown(cyan);
      jest.runAllTimers();
    });
    expect(cyan.closest(".contextMenu")).not.toBeInTheDocument();
  });

  test("Low menu with JSX element label", async () => {
    const action = jest.fn();
    await act(async () =>
      render(
        <ContextMenuHandler
          menuItems={[
            {
              label: <span data-testid="custom-label">Custom JSX</span>,
              action,
            },
          ]}
          showLowMenu
        >
          <div data-testid="inside-div" />
        </ContextMenuHandler>,
      ),
    );
    const testDiv = screen.getByTestId("inside-div");
    await act(async () => {
      fireEvent.mouseEnter(testDiv);
      jest.runAllTimers();
    });
    const customLabel = screen.getByTestId("custom-label");
    expect(customLabel).toBeVisible();
  });

  test("Low menu submenu with action click", async () => {
    const setColour = jest.fn();
    await act(async () =>
      render(
        <ContextMenuHandler
          menuItems={menuItems(setColour)}
          showLowMenu
        >
          <div data-testid="inside-div" />
        </ContextMenuHandler>,
      ),
    );
    const testDiv = screen.getByTestId("inside-div");
    await act(async () => {
      fireEvent.mouseEnter(testDiv);
      jest.runAllTimers();
    });

    // Open submenu and click on an item with action
    const lowMenuBlue = screen.queryByLabelText("Blue") as HTMLDivElement;
    fireEvent.mouseEnter(lowMenuBlue);
    const lowMenuBlueSubmenu = screen.queryByLabelText("Sub menu for Blue") as HTMLSpanElement;
    fireEvent.mouseEnter(lowMenuBlueSubmenu);

    const lightBlue = screen.getByLabelText("Light blue") as HTMLSpanElement;
    await act(async () => {
      fireEvent.mouseDown(lightBlue);
      jest.runAllTimers();
    });
    expect(setColour).toHaveBeenCalledWith("lightblue");
  });
});
