import { fireEvent, render, screen } from "@testing-library/react";
import { ContextWindowTitleButton } from "./ContextWindowTitleButton";

describe("ContextWindowTitleButton", () => {
  test("Renders an accessible button with the given class, title and children", () => {
    render(
      <ContextWindowTitleButton
        className="myButton"
        label="Dock"
        title="Dock my window"
      >
        <span data-testid="icon" />
      </ContextWindowTitleButton>,
    );
    const button = screen.getByRole("button", { name: "Dock" });
    expect(button).toHaveClass("myButton");
    expect(button).toHaveAttribute("title", "Dock my window");
    expect(button).toContainElement(screen.getByTestId("icon"));
  });

  test("Calls onClick when clicked", () => {
    const onClick = jest.fn();
    render(
      <ContextWindowTitleButton
        className="myButton"
        label="Close"
        title="Close"
        onClick={onClick}
      >
        x
      </ContextWindowTitleButton>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test("Clicking without an onClick handler does not throw", () => {
    render(
      <ContextWindowTitleButton
        className="myButton"
        label="Close"
        title="Close"
      >
        x
      </ContextWindowTitleButton>,
    );
    expect(() => fireEvent.click(screen.getByRole("button", { name: "Close" }))).not.toThrow();
  });
});
