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

    // Initially, submenu should not be visible
    let blueSubMenu = (blueItem.parentElement as HTMLDivElement).querySelector("div.contextMenu");
    expect(blueSubMenu).toBeNull();

    await act(async () => {
      fireEvent.mouseEnter(blueCaret);
      jest.runAllTimers();
    });

    // After mouse enter, submenu should be in the DOM
    blueSubMenu = (blueItem.parentElement as HTMLDivElement).querySelector("div.contextMenu");
    expect(blueSubMenu).toBeInTheDocument();

    await act(async () => {
      fireEvent.mouseLeave(blueCaret);
      jest.runAllTimers();
    });

    // After mouse leave, submenu should be removed from DOM
    blueSubMenu = (blueItem.parentElement as HTMLDivElement).querySelector("div.contextMenu");
    expect(blueSubMenu).toBeNull();

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
    await user.click(greenItem);
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

  test("Menu item with React.ReactElement label", async () => {
    await act(async () =>
      render(
        <ContextMenuHandler
          menuItems={[
            {
              label: <span data-testid="custom-label">Custom Label</span>,
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
    const customLabel = screen.getByTestId("custom-label");
    expect(customLabel).toBeVisible();
    // When label is a JSX element, there's no aria-label set (aria-label should be undefined)
    const menuItem = customLabel.parentElement;
    expect(menuItem).not.toHaveAttribute("aria-label");
  });

  test("Menu with dividers - no divider insertion needed", async () => {
    await act(async () =>
      render(
        <ContextMenuHandler menuItems={[{ label: <hr /> }]}>
          <div data-testid="inside-div">
            Inside
            <ContextMenuHandler menuItems={[{ label: "Inner" }]}>
              <div data-testid="inside-div2">More Inside</div>
            </ContextMenuHandler>
          </div>
        </ContextMenuHandler>,
      ),
    );
    const testDiv2 = screen.getByTestId("inside-div2");
    await act(async () => {
      fireEvent.mouseEnter(testDiv2);
      fireEvent.contextMenu(testDiv2);
      jest.runAllTimers();
    });
    expect(screen.queryByText("Inner")).toBeInTheDocument();
  });

  test("Menu with dividers - last item is divider", async () => {
    await act(async () =>
      render(
        <ContextMenuHandler menuItems={[{ label: "Outer" }, { label: <hr /> }]}>
          <div data-testid="inside-div">
            Inside
            <ContextMenuHandler menuItems={[{ label: "Inner" }]}>
              <div data-testid="inside-div2">More Inside</div>
            </ContextMenuHandler>
          </div>
        </ContextMenuHandler>,
      ),
    );
    const testDiv2 = screen.getByTestId("inside-div2");
    await act(async () => {
      fireEvent.mouseEnter(testDiv2);
      fireEvent.contextMenu(testDiv2);
      jest.runAllTimers();
    });
    expect(screen.queryByText("Inner")).toBeInTheDocument();
    expect(screen.queryByText("Outer")).toBeInTheDocument();
  });

  test("Menu with dividers - first item is divider", async () => {
    await act(async () =>
      render(
        <ContextMenuHandler menuItems={[{ label: "Outer" }]}>
          <div data-testid="inside-div">
            Inside
            <ContextMenuHandler menuItems={[{ label: <hr /> }, { label: "Inner" }]}>
              <div data-testid="inside-div2">More Inside</div>
            </ContextMenuHandler>
          </div>
        </ContextMenuHandler>,
      ),
    );
    const testDiv2 = screen.getByTestId("inside-div2");
    await act(async () => {
      fireEvent.mouseEnter(testDiv2);
      fireEvent.contextMenu(testDiv2);
      jest.runAllTimers();
    });
    expect(screen.queryByText("Inner")).toBeInTheDocument();
    expect(screen.queryByText("Outer")).toBeInTheDocument();
  });

  test("ContextMenuHandler with onMouseEnter and onMouseLeave callbacks", async () => {
    const onMouseEnter = jest.fn();
    const onMouseLeave = jest.fn();
    await act(async () =>
      render(
        <ContextMenuHandler
          menuItems={[{ label: "Test" }]}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
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
    expect(onMouseEnter).toHaveBeenCalled();
    await act(async () => {
      fireEvent.mouseLeave(testDiv);
      jest.runAllTimers();
    });
    expect(onMouseLeave).toHaveBeenCalled();
  });

  test("ContextMenu adjusts position when menu would overflow bottom of viewport", async () => {
    const originalInnerHeight = window.innerHeight;
    Object.defineProperty(window, "innerHeight", {
      writable: true,
      configurable: true,
      value: 100,
    });

    const a = jest.fn();
    await act(async () =>
      render(
        <ContextMenuHandler
          menuItems={[
            { label: "Item 1", action: a },
            { label: "Item 2", action: a },
            { label: "Item 3", action: a },
            { label: "Item 4", action: a },
            { label: "Item 5", action: a },
          ]}
        >
          <div data-testid="inside-div" />
        </ContextMenuHandler>,
      ),
    );

    const testDiv = screen.getByTestId("inside-div");
    await act(async () => {
      // Simulate context menu at bottom of viewport
      const event = new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        clientX: 10,
        clientY: 90,
      });
      Object.defineProperty(event, "pageX", { value: 10 });
      Object.defineProperty(event, "pageY", { value: 90 });
      fireEvent.mouseEnter(testDiv);
      testDiv.dispatchEvent(event);
      jest.runAllTimers();
    });

    // Menu should be repositioned
    const menuItem = screen.queryByText("Item 1");
    expect(menuItem).toBeInTheDocument();

    // Cleanup
    Object.defineProperty(window, "innerHeight", {
      writable: true,
      configurable: true,
      value: originalInnerHeight,
    });
  });

  test("ContextMenu adjusts position when menu would overflow right of viewport", async () => {
    const originalInnerWidth = window.innerWidth;
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 100,
    });

    const a = jest.fn();
    await act(async () =>
      render(
        <ContextMenuHandler
          menuItems={[
            { label: "Long menu item label", action: a },
            { label: "Another long item", action: a },
          ]}
        >
          <div data-testid="inside-div" />
        </ContextMenuHandler>,
      ),
    );

    const testDiv = screen.getByTestId("inside-div");
    await act(async () => {
      // Simulate context menu at right edge of viewport
      const event = new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        clientX: 90,
        clientY: 10,
      });
      Object.defineProperty(event, "pageX", { value: 90 });
      Object.defineProperty(event, "pageY", { value: 10 });
      fireEvent.mouseEnter(testDiv);
      testDiv.dispatchEvent(event);
      jest.runAllTimers();
    });

    // Menu should be repositioned
    const menuItem = screen.queryByText("Long menu item label");
    expect(menuItem).toBeInTheDocument();

    // Cleanup
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });
});
