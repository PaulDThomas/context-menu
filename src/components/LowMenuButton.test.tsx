import { fireEvent, render, screen } from "@testing-library/react";
import { LowMenuButton } from "./LowMenuButton";

jest.mock("./LowSubMenu");

describe("LowMenuButton", () => {
  afterEach(() => {
    window.getSelection()?.removeAllRanges();
  });

  test("Renders a string label with an aria-label", () => {
    render(<LowMenuButton entry={{ label: "Bold" }} />);
    const button = screen.getByLabelText("Bold");
    expect(button).toHaveClass("lowMenuItem");
    expect(button).not.toHaveClass("disabled");
    expect(button).toHaveTextContent("Bold");
  });

  test("Renders an element label without an aria-label", () => {
    const { container } = render(
      <LowMenuButton entry={{ label: <i data-testid="element-label">Italic</i> }} />,
    );
    expect(screen.getByTestId("element-label")).toBeInTheDocument();
    expect(container.firstChild).not.toHaveAttribute("aria-label");
  });

  test("Clicking calls the action with no selection", () => {
    const action = jest.fn();
    render(<LowMenuButton entry={{ label: "Bold", action }} />);
    fireEvent.click(screen.getByLabelText("Bold"));
    expect(action).toHaveBeenCalledWith(null);
  });

  test("Clicking without an action does not throw", () => {
    render(<LowMenuButton entry={{ label: "Bold" }} />);
    expect(() => fireEvent.click(screen.getByLabelText("Bold"))).not.toThrow();
  });

  test("Passes the selection captured on mouse enter to the action", () => {
    const action = jest.fn();
    const text = document.createElement("p");
    text.textContent = "Selected text";
    document.body.appendChild(text);
    const range = document.createRange();
    range.selectNodeContents(text);
    window.getSelection()?.addRange(range);

    render(<LowMenuButton entry={{ label: "Bold", action }} />);
    const button = screen.getByLabelText("Bold");
    fireEvent.mouseEnter(button);
    fireEvent.click(button);
    expect((action.mock.calls[0][0] as Range).toString()).toBe("Selected text");

    fireEvent.mouseLeave(button);
    fireEvent.click(button);
    expect(action).toHaveBeenLastCalledWith(null);
    text.remove();
  });

  test("Disabled entries do not call the action", () => {
    const action = jest.fn();
    render(<LowMenuButton entry={{ label: "Bold", action, disabled: true }} />);
    const button = screen.getByLabelText("Bold");
    expect(button).toHaveClass("lowMenuItem disabled");
    expect(button).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(button);
    expect(action).not.toHaveBeenCalled();
  });

  test("Shows the default check mark when selected", () => {
    const { container } = render(<LowMenuButton entry={{ label: "Bold", selected: true }} />);
    const check = container.querySelector(".lowMenuItemCheck");
    expect(check).toHaveTextContent("\u2713");
    expect(check).toHaveAttribute("aria-hidden", "true");
  });

  test("Shows a custom selected icon", () => {
    const { container } = render(
      <LowMenuButton entry={{ label: "Bold", selected: true, selectedIcon: "*" }} />,
    );
    expect(container.querySelector(".lowMenuItemCheck")).toHaveTextContent("*");
  });

  test("Does not show a check mark when not selected", () => {
    const { container } = render(<LowMenuButton entry={{ label: "Bold" }} />);
    expect(container.querySelector(".lowMenuItemCheck")).not.toBeInTheDocument();
  });

  test("Passes the entry down to LowSubMenu when it has a group", () => {
    render(<LowMenuButton entry={{ label: "Format", group: [{ label: "A" }, { label: "B" }] }} />);
    const sub = screen.getByTestId("mock-low-sub-menu");
    expect(sub).toHaveAttribute("data-entry-label", "Format");
    expect(sub).toHaveAttribute("data-entries", "A,B");
  });

  test("Does not render LowSubMenu without a group", () => {
    render(<LowMenuButton entry={{ label: "Bold" }} />);
    expect(screen.queryByTestId("mock-low-sub-menu")).not.toBeInTheDocument();
  });
});
