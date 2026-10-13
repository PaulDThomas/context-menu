import { fireEvent, render, screen } from "@testing-library/react";
import { ContextMenuEntry } from "./ContextMenuEntry";

jest.mock("./ContextSubMenu");

describe("ContextMenuEntry", () => {
  afterEach(() => {
    window.getSelection()?.removeAllRanges();
  });

  test("Renders a string label", () => {
    const { container } = render(
      <ContextMenuEntry
        entry={{ label: "Copy" }}
        selectedSpace={false}
        toClose={jest.fn()}
      />,
    );
    expect(container.firstChild).toHaveClass("contextMenuItem");
    expect(container.firstChild).not.toHaveClass("disabled");
    expect(screen.getByLabelText("Copy")).toHaveClass("contextMenuItemLabel");
  });

  test("Renders an element label as given", () => {
    render(
      <ContextMenuEntry
        entry={{ label: <hr data-testid="divider" /> }}
        selectedSpace={false}
        toClose={jest.fn()}
      />,
    );
    expect(screen.getByTestId("divider")).toBeInTheDocument();
  });

  test("Mouse down calls the action and closes the menu", () => {
    const action = jest.fn();
    const toClose = jest.fn();
    render(
      <ContextMenuEntry
        entry={{ label: "Copy", action }}
        selectedSpace={false}
        toClose={toClose}
      />,
    );
    fireEvent.mouseDown(screen.getByLabelText("Copy"));
    expect(action).toHaveBeenCalledWith(null, expect.objectContaining({ type: "mousedown" }));
    expect(toClose).toHaveBeenCalledTimes(1);
  });

  test("Passes the selection captured on mouse enter to the action", () => {
    const action = jest.fn();
    const text = document.createElement("p");
    text.textContent = "Selected text";
    document.body.appendChild(text);
    const range = document.createRange();
    range.selectNodeContents(text);
    window.getSelection()?.addRange(range);

    render(
      <ContextMenuEntry
        entry={{ label: "Copy", action }}
        selectedSpace={false}
        toClose={jest.fn()}
      />,
    );
    const label = screen.getByLabelText("Copy");
    fireEvent.mouseEnter(label);
    fireEvent.mouseDown(label);
    expect((action.mock.calls[0][0] as Range).toString()).toBe("Selected text");

    fireEvent.mouseLeave(label);
    fireEvent.mouseDown(label);
    expect(action.mock.calls[1][0]).toBeNull();
    text.remove();
  });

  test("Disabled entries neither act nor close", () => {
    const action = jest.fn();
    const toClose = jest.fn();
    const { container } = render(
      <ContextMenuEntry
        entry={{ label: "Copy", action, disabled: true }}
        selectedSpace={false}
        toClose={toClose}
      />,
    );
    expect(container.firstChild).toHaveClass("contextMenuItem disabled");
    const label = screen.getByLabelText("Copy");
    expect(label).toHaveAttribute("aria-disabled", "true");
    fireEvent.mouseDown(label);
    expect(action).not.toHaveBeenCalled();
    expect(toClose).not.toHaveBeenCalled();
  });

  test("No check column without selectedSpace", () => {
    const { container } = render(
      <ContextMenuEntry
        entry={{ label: "Copy", selected: true }}
        selectedSpace={false}
        toClose={jest.fn()}
      />,
    );
    expect(container.querySelector(".contextMenuItemCheck")).not.toBeInTheDocument();
  });

  test.each([
    [{ selected: true }, "\u2713"],
    [{ selected: true, selectedIcon: "*" }, "*"],
    [{ selected: false }, "\u00a0"],
  ])("Check column content for %j", (flags, expected) => {
    const { container } = render(
      <ContextMenuEntry
        entry={{ label: "Copy", ...flags }}
        selectedSpace={true}
        toClose={jest.fn()}
      />,
    );
    const check = container.querySelector(".contextMenuItemCheck");
    expect(check).toHaveAttribute("aria-hidden", "true");
    expect(check?.textContent).toBe(expected);
  });

  test("Does not render a sub menu without a group", () => {
    render(
      <ContextMenuEntry
        entry={{ label: "Copy" }}
        selectedSpace={false}
        toClose={jest.fn()}
      />,
    );
    expect(screen.queryByTestId("mock-context-sub-menu")).not.toBeInTheDocument();
  });

  test("Passes group entries and toClose down to ContextSubMenu, toggling visibility on hover", () => {
    const toClose = jest.fn();
    const { container } = render(
      <ContextMenuEntry
        entry={{ label: "Colour", group: [{ label: "Red" }, { label: "Blue" }] }}
        selectedSpace={false}
        toClose={toClose}
      />,
    );
    const sub = screen.getByTestId("mock-context-sub-menu");
    expect(sub).toHaveAttribute("data-entries", "Red,Blue");
    expect(sub).toHaveAttribute("data-visible", "false");

    fireEvent.mouseEnter(container.firstChild as HTMLElement);
    expect(sub).toHaveAttribute("data-visible", "true");
    fireEvent.mouseLeave(container.firstChild as HTMLElement);
    expect(sub).toHaveAttribute("data-visible", "false");

    fireEvent.click(screen.getByText("mock-sub-menu-close"));
    expect(toClose).toHaveBeenCalledTimes(1);
  });
});
