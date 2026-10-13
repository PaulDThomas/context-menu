import { fireEvent, render, screen } from "@testing-library/react";
import { ContextSubMenu } from "./ContextSubMenu";

jest.mock("./ContextMenu");

describe("ContextSubMenu", () => {
  const entries = [{ label: "One" }, { label: "Two" }];

  test("Shows only the caret when not visible", () => {
    const { container } = render(
      <ContextSubMenu
        entries={entries}
        toClose={jest.fn()}
        visible={false}
      />,
    );
    const holder = container.firstChild as HTMLElement;
    expect(holder).toHaveClass("caretHolder");
    expect(holder.querySelector("svg")).toBeInTheDocument();
    expect(screen.queryByTestId("mock-context-menu")).not.toBeInTheDocument();
  });

  test("Renders a positioned ContextMenu with the entries when visible", () => {
    render(
      <ContextSubMenu
        entries={entries}
        toClose={jest.fn()}
        visible={true}
      />,
    );
    const menu = screen.getByTestId("mock-context-menu");
    expect(menu.parentElement).toHaveClass("subMenu");
    expect(menu).toHaveAttribute("data-visible", "true");
    expect(menu).toHaveAttribute("data-entries", "One,Two");
    expect(menu).toHaveAttribute("data-x-pos", "14");
    expect(menu).toHaveAttribute("data-y-pos", "-21");
  });

  test("Passes toClose down to the ContextMenu", () => {
    const toClose = jest.fn();
    render(
      <ContextSubMenu
        entries={entries}
        toClose={toClose}
        visible={true}
      />,
    );
    fireEvent.click(screen.getByText("mock-context-menu-close"));
    expect(toClose).toHaveBeenCalledTimes(1);
  });
});
