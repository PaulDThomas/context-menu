import { fireEvent, render, screen } from "@testing-library/react";
import { ContextWindowTitleBar } from "./ContextWindowTitleBar";

jest.mock("./ContextWindowTitleButton");

describe("ContextWindowTitleBar", () => {
  const renderTitleBar = (
    props: Partial<React.ComponentProps<typeof ContextWindowTitleBar>> = {},
  ) =>
    render(
      <ContextWindowTitleBar
        title="My window"
        moving={false}
        onMouseDown={jest.fn()}
        {...props}
      />,
    );

  test("Renders the title text with a tooltip", () => {
    renderTitleBar();
    const text = screen.getByText("My window");
    expect(text).toHaveClass("contextWindowTitleText");
    expect(text).toHaveAttribute("title", "My window");
  });

  test("Renders titleElement in place of the title text", () => {
    renderTitleBar({ titleElement: <b data-testid="custom-title">Custom</b> });
    expect(screen.getByTestId("custom-title")).toBeInTheDocument();
    expect(screen.queryByText("My window")).not.toBeInTheDocument();
    expect(screen.getByTitle("My window")).toContainElement(screen.getByTestId("custom-title"));
  });

  test("Applies the moving class only while moving", () => {
    const { container, rerender } = renderTitleBar();
    const bar = container.firstChild as HTMLElement;
    expect(bar).toHaveClass("contextWindowTitle");
    expect(bar).not.toHaveClass("moving");
    rerender(
      <ContextWindowTitleBar
        title="My window"
        moving={true}
        onMouseDown={jest.fn()}
      />,
    );
    expect(bar).toHaveClass("contextWindowTitle moving");
  });

  test("Forwards mouse down on the bar", () => {
    const onMouseDown = jest.fn();
    renderTitleBar({ onMouseDown });
    fireEvent.mouseDown(screen.getByText("My window"));
    expect(onMouseDown).toHaveBeenCalledTimes(1);
  });

  test("Always renders the close button and passes its props", () => {
    const onClose = jest.fn();
    renderTitleBar({ onClose });
    const close = screen.getByTestId("mock-title-button-Close");
    expect(close).toHaveAttribute("data-class-name", "contextWindowTitleClose");
    expect(close).toHaveAttribute("data-title", "Close My window");
    expect(close.querySelector("svg")).toBeInTheDocument();
    fireEvent.click(close);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("Hides dock and undock buttons when no callbacks are provided", () => {
    renderTitleBar();
    expect(screen.queryByTestId("mock-title-button-Dock")).not.toBeInTheDocument();
    expect(screen.queryByTestId("mock-title-button-Undock")).not.toBeInTheDocument();
  });

  test("Shows the dock button when onDock is set", () => {
    const onDock = jest.fn();
    renderTitleBar({ onDock });
    const dock = screen.getByTestId("mock-title-button-Dock");
    expect(dock).toHaveAttribute("data-class-name", "dockButton");
    expect(dock).toHaveAttribute("data-title", "Dock My window");
    expect(dock.querySelector("svg")).toHaveAttribute("width", "14");
    fireEvent.click(dock);
    expect(onDock).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("mock-title-button-Undock")).not.toBeInTheDocument();
  });

  test("Shows the undock button when onUndock is set", () => {
    const onUndock = jest.fn();
    renderTitleBar({ onUndock });
    const undock = screen.getByTestId("mock-title-button-Undock");
    expect(undock).toHaveAttribute("data-class-name", "undockButton");
    expect(undock).toHaveAttribute("data-title", "Undock My window");
    expect(undock.querySelector("svg")).toHaveAttribute("width", "14");
    fireEvent.click(undock);
    expect(onUndock).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("mock-title-button-Dock")).not.toBeInTheDocument();
  });

  test.each(["", "   "])("Uses 'window' in button titles when the title is %j", (title) => {
    renderTitleBar({ title, onDock: jest.fn(), onUndock: jest.fn() });
    expect(screen.getByTestId("mock-title-button-Dock")).toHaveAttribute(
      "data-title",
      "Dock window",
    );
    expect(screen.getByTestId("mock-title-button-Undock")).toHaveAttribute(
      "data-title",
      "Undock window",
    );
    expect(screen.getByTestId("mock-title-button-Close")).toHaveAttribute(
      "data-title",
      "Close window",
    );
  });
});
