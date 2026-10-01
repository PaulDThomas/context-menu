import { fireEvent, render, screen } from "@testing-library/react";
import { DockPanelTabButton } from "./DockPanelTabButton";

describe("DockPanelTabButton", () => {
  test("Inactive tab shows the window id", () => {
    render(
      <DockPanelTabButton
        windowId="win-1"
        isActive={false}
        onClick={jest.fn()}
      />,
    );
    const button = screen.getByRole("button", { name: "win-1" });
    expect(button).toHaveAttribute("title", "Activate win-1");
    expect(button).toHaveClass("dockTabButton");
    expect(button).not.toHaveClass("activeDockTabButton");
  });

  test("Active tab has the active class", () => {
    render(
      <DockPanelTabButton
        windowId="win-2"
        isActive={true}
        onClick={jest.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "win-2" })).toHaveClass(
      "dockTabButton activeDockTabButton",
    );
  });

  test("Calls onClick when clicked", () => {
    const onClick = jest.fn();
    render(
      <DockPanelTabButton
        windowId="win-3"
        isActive={false}
        onClick={onClick}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "win-3" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
