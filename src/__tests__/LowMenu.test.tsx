import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { menuItems } from "../__mocks__/mockMenu";
import { ContextMenuHandler } from "../components/ContextMenuHandler";

describe("Context menu", () => {
  const a = jest.fn();
  const user = userEvent.setup();
  test("Empty render, click expan", async () => {
    render(
      <ContextMenuHandler
        menuItems={[{ label: "Hello", action: a, group: [] }]}
        showLowMenu
      >
        <div data-testid="inside-div" />
      </ContextMenuHandler>,
    );
    const testDiv = screen.getByTestId("inside-div");
    fireEvent.contextMenu(testDiv);
    expect(screen.queryByText("Hello")).toBeInTheDocument();
    const h = screen.getByText("Hello");
    await user.click(h);
    expect(a).toHaveBeenCalled();
  });

  test("Move the mouse", async () => {
    const setColour = jest.fn();
    render(
      <ContextMenuHandler
        menuItems={menuItems(setColour)}
        showLowMenu
      >
        <div data-testid="inside-div">Inside</div>
        <div data-testid="another-div">Outside</div>
      </ContextMenuHandler>,
    );
    const testDiv = screen.getByTestId("inside-div");
    const lowMenu = screen.queryByLabelText("Low context menu") as HTMLDivElement;
    // Count moust in/out
    fireEvent.mouseEnter(lowMenu);
    fireEvent.mouseLeave(lowMenu);

    // Show context submenu
    const lowMenuBlue = screen.queryByLabelText("Blue") as HTMLDivElement;
    expect(lowMenuBlue).toBeVisible();
    fireEvent.doubleClick(testDiv);
    fireEvent.mouseEnter(lowMenu);
    fireEvent.mouseEnter(lowMenuBlue);
    const lowMenuBlueSubmenu = screen.queryByLabelText("Sub menu for Blue") as HTMLSpanElement;
    expect(lowMenuBlueSubmenu).toBeVisible();
    const cyan = screen.queryByLabelText("Cyan") as HTMLDivElement;
    expect(cyan.closest(".context-menu")).not.toHaveClass("visible");
    fireEvent.mouseEnter(lowMenuBlueSubmenu);
    expect(cyan.closest(".context-menu")).toHaveClass("visible");
    fireEvent.mouseLeave(lowMenuBlueSubmenu);
    expect(cyan.closest(".context-menu")).not.toHaveClass("visible");
    // Fire close event
    fireEvent.mouseEnter(lowMenuBlueSubmenu);
    expect(cyan.closest(".context-menu")).toHaveClass("visible");
    fireEvent.mouseDown(cyan);
    expect(cyan.closest(".context-menu")).not.toHaveClass("visible");
  });
});
