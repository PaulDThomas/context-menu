import { fireEvent, render, screen } from "@testing-library/react";
import { LowSubMenu } from "./LowSubMenu";

jest.mock("./ContextMenu");

describe("LowSubMenu", () => {
  const entry = {
    label: "Parent",
    group: [{ label: "One" }, { label: "Two" }, { label: "Three" }],
  };

  test("Renders nothing without a group", () => {
    const { container } = render(<LowSubMenu entry={{ label: "Parent" }} />);
    expect(container).toBeEmptyDOMElement();
  });

  test("Renders nothing with an empty group", () => {
    const { container } = render(<LowSubMenu entry={{ label: "Parent", group: [] }} />);
    expect(container).toBeEmptyDOMElement();
  });

  test("Shows the caret without a menu until hovered", () => {
    render(<LowSubMenu entry={entry} />);
    const holder = screen.getByLabelText("Sub menu for Parent");
    expect(holder).toHaveClass("caretHolder");
    expect(holder.querySelector("svg")).toBeInTheDocument();
    expect(holder.querySelector(".subMenu")).toBeInTheDocument();
    expect(screen.queryByTestId("mock-context-menu")).not.toBeInTheDocument();
  });

  test("Hovering shows a ContextMenu positioned above the caret", () => {
    render(<LowSubMenu entry={entry} />);
    fireEvent.mouseEnter(screen.getByLabelText("Sub menu for Parent"));
    const menu = screen.getByTestId("mock-context-menu");
    expect(menu).toHaveAttribute("data-visible", "true");
    expect(menu).toHaveAttribute("data-entries", "One,Two,Three");
    expect(menu).toHaveAttribute("data-x-pos", "14");
    expect(menu).toHaveAttribute("data-y-pos", String(3 * -21 - 8));
  });

  test("Leaving hides the ContextMenu", () => {
    render(<LowSubMenu entry={entry} />);
    const holder = screen.getByLabelText("Sub menu for Parent");
    fireEvent.mouseEnter(holder);
    fireEvent.mouseLeave(holder);
    expect(screen.queryByTestId("mock-context-menu")).not.toBeInTheDocument();
  });

  test("The ContextMenu toClose callback hides the menu", () => {
    render(<LowSubMenu entry={entry} />);
    fireEvent.mouseEnter(screen.getByLabelText("Sub menu for Parent"));
    fireEvent.click(screen.getByText("mock-context-menu-close"));
    expect(screen.queryByTestId("mock-context-menu")).not.toBeInTheDocument();
  });
});
