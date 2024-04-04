import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { menuItems } from "../../__dummy__/mockMenu";
import { ContextMenuHandler } from "./ContextMenuHandler";

describe("Context menu", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });
  const user = userEvent.setup({ delay: null });

  test("Empty render, request and click context", async () => {
    const a = jest.fn();
    await act(async () =>
      render(
        <ContextMenuHandler
          menuItems={[
            {
              label: "Hello",
              action: a,
            },
          ]}
        >
          <div data-testid="inside-div" />
        </ContextMenuHandler>,
      ),
    );
    const testDiv = screen.getByTestId("inside-div");
    await act(async () => {
      fireEvent.mouseEnter(testDiv);
      fireEvent.contextMenu(testDiv);
      jest.runAllTimers();
    });
    const h = screen.getByText("Hello") as HTMLSpanElement;
    expect(h).toBeVisible();
    await user.click(h);
    expect(a).toHaveBeenCalled();
  });

  test("Move the mouse", async () => {
    const setColour = jest.fn();
    await act(async () =>
      render(
        <ContextMenuHandler menuItems={menuItems(setColour)}>
          <div data-testid="inside-div">Inside</div>
          <div data-testid="another-div">Outside</div>
        </ContextMenuHandler>,
      ),
    );
    const testDiv = screen.getByTestId("inside-div");
    // Show content menu
    await act(async () => {
      fireEvent.mouseEnter(testDiv);
      fireEvent.contextMenu(testDiv);
      jest.runAllTimers();
    });
    expect(screen.queryByText("Blue")).toBeInTheDocument();

    // Do nothing for more contenxt menu
    await act(async () => {
      fireEvent.contextMenu(screen.queryByText("Blue") as HTMLDivElement);
      jest.runAllTimers();
      fireEvent.mouseLeave(screen.queryByText("Blue") as HTMLDivElement);
    });

    // Mouse over & leave
    const blueItem = screen.getByText("Blue") as HTMLSpanElement;
    const blueCaret = (blueItem.parentElement as HTMLDivElement).querySelector("svg") as SVGElement;
    const blueSubMenu = (blueItem.parentElement as HTMLDivElement).querySelector(
      "div.contextMenu",
    ) as HTMLDivElement;
    expect(blueSubMenu).toHaveClass("hidden");
    await act(async () => {
      fireEvent.mouseOver(blueCaret);
      jest.runAllTimers();
    });
    expect(blueSubMenu).toHaveClass("visible");
    fireEvent.mouseLeave(blueCaret);
    expect(blueSubMenu).toHaveClass("hidden");

    // Click off menu
    const notDiv = screen.getByTestId("another-div");
    await user.click(notDiv);
    await act(async () => {
      jest.runAllTimers();
    });
    expect(screen.queryByText("Blue")).not.toBeInTheDocument();

    // Content menu click & close
    await act(async () => {
      fireEvent.mouseEnter(testDiv);
      fireEvent.contextMenu(testDiv);
      jest.runAllTimers();
    });
    const greenItem = screen.getByText("Green");
    await act(async () => {
      await user.click(greenItem);
      jest.runAllTimers();
    });
    // Wait for the menu to be removed
    await act(async () => {
      jest.runAllTimers();
    });
    expect(setColour).toHaveBeenCalledTimes(1);
    expect(setColour).toHaveBeenCalledWith("green");
    expect(greenItem).not.toBeInTheDocument();
  });

  test("Menu in a menu", async () => {
    await act(async () =>
      render(
        <ContextMenuHandler menuItems={[{ label: "Outer" }]}>
          <div data-testid="inside-div">
            Inside
            <ContextMenuHandler menuItems={[{ label: "Inner" }]}>
              <div data-testid="inside-div2">More Inside</div>
            </ContextMenuHandler>
          </div>
        </ContextMenuHandler>,
      ),
    );
    // Show content menu
    const testDiv = screen.getByTestId("inside-div");
    await act(async () => {
      fireEvent.mouseEnter(testDiv);
      fireEvent.contextMenu(testDiv);
      jest.runAllTimers();
    });
    expect(screen.queryAllByText("Outer").length).toBe(1);
    expect(screen.queryAllByText("Inner").length).toBe(0);
    fireEvent.mouseDown(document);
    // Show both content menus
    const testDiv2 = screen.getByTestId("inside-div2");
    await act(async () => {
      fireEvent.mouseEnter(testDiv2);
      fireEvent.contextMenu(testDiv2);
      jest.runAllTimers();
    });
    expect(screen.queryAllByText("Outer").length).toBe(1);
    expect(screen.queryAllByText("Inner").length).toBe(1);
  });
});
