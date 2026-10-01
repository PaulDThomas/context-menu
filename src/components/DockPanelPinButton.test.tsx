import { fireEvent, render, screen } from "@testing-library/react";
import { DockPanelPinButton } from "./DockPanelPinButton";

describe("DockPanelPinButton", () => {
  test("Unpinned state offers to pin", () => {
    render(
      <DockPanelPinButton
        edge="left"
        isPinned={false}
        onClick={jest.fn()}
      />,
    );
    const button = screen.getByRole("button", { name: "Pin left dock panel" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button).toHaveAttribute("title", "Pin: hide window contents");
    expect(button).toHaveClass("dockPinButton");
    expect(button).not.toHaveClass("dockPinButtonPinned");
    expect(button.querySelector("svg")).toHaveAttribute("width", "12");
  });

  test("Pinned state offers to unpin", () => {
    render(
      <DockPanelPinButton
        edge="bottom"
        isPinned={true}
        onClick={jest.fn()}
      />,
    );
    const button = screen.getByRole("button", { name: "Unpin bottom dock panel" });
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveAttribute("title", "Unpin: show window contents");
    expect(button).toHaveClass("dockPinButton dockPinButtonPinned");
  });

  test("Calls onClick when clicked", () => {
    const onClick = jest.fn();
    render(
      <DockPanelPinButton
        edge="top"
        isPinned={false}
        onClick={onClick}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Pin top dock panel" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
