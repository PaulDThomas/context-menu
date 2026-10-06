import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMockDocking } from "./__mocks__/mockDocking";
import { ContextWindowTitleBar } from "./ContextWindowTitleBar";
import { DockingContext } from "./DockingContext";
import type { WindowConfig } from "./interface";

jest.mock("./ContextWindowTitleButton");

describe("ContextWindowTitleBar", () => {
  test.each([
    [true, false, true],
    [true, true, false],
    [true, undefined, false],
    [false, false, false],
    [false, true, false],
    [false, undefined, false],
  ])(
    "locked cursor for docked=%s and allowUndock=%s is %s",
    (isDocked, allowUndock, expectedDisabled) => {
      const windowConfig: WindowConfig = { title: "My window", allowUndock };
      const mockDocking = createMockDocking(new Map());
      mockDocking.getWindowConfig = () => windowConfig;
      mockDocking.getDockedWindow = () =>
        isDocked ? { id: "test-window", edge: "left", order: 0 } : undefined;

      const { container } = render(
        <DockingContext.Provider value={mockDocking}>
          <ContextWindowTitleBar id="test-window" />
        </DockingContext.Provider>,
      );
      const bar = container.querySelector(".contextWindowTitle");
      expect(bar?.classList.contains("undockDisabled")).toBe(expectedDisabled);
    },
  );

  test("Renders the title text with a tooltip", () => {
    const windowConfig: WindowConfig = { title: "My window" };
    const windowConfigs = new Map([["test-window", windowConfig]]);
    const mockDocking = createMockDocking(
      new Map(),
      {},
      () => {},
      new Map(),
      new Set(),
      new Map(),
      windowConfigs,
    );

    render(
      <DockingContext.Provider value={mockDocking}>
        <ContextWindowTitleBar id="test-window" />
      </DockingContext.Provider>,
    );
    const text = screen.getByText("My window");
    expect(text).toHaveClass("contextWindowTitleText");
    expect(text).toHaveAttribute("title", "My window");
  });

  test("Renders titleElement in place of the title text", () => {
    const windowConfig: WindowConfig = {
      title: "My window",
      titleElement: <b data-testid="custom-title">Custom</b>,
    };
    const windowConfigs = new Map([["test-window", windowConfig]]);
    const mockDocking = createMockDocking(
      new Map(),
      {},
      () => {},
      new Map(),
      new Set(),
      new Map(),
      windowConfigs,
    );

    render(
      <DockingContext.Provider value={mockDocking}>
        <ContextWindowTitleBar id="test-window" />
      </DockingContext.Provider>,
    );
    expect(screen.getByTestId("custom-title")).toBeInTheDocument();
    expect(screen.queryByText("My window")).not.toBeInTheDocument();
    expect(screen.getByTitle("My window")).toContainElement(screen.getByTestId("custom-title"));
  });

  test("Applies the moving class when moving prop is true", () => {
    const windowConfig: WindowConfig = { title: "My window", moving: true };
    const windowConfigs = new Map([["test-window", windowConfig]]);
    const mockDocking = createMockDocking(
      new Map(),
      {},
      () => {},
      new Map(),
      new Set(),
      new Map(),
      windowConfigs,
    );

    const { container } = render(
      <DockingContext.Provider value={mockDocking}>
        <ContextWindowTitleBar id="test-window" />
      </DockingContext.Provider>,
    );
    const bar = container.querySelector(".contextWindowTitle");
    expect(bar).toHaveClass("contextWindowTitle moving");
  });

  test("Does not apply moving class when moving prop is false", () => {
    const windowConfig: WindowConfig = { title: "My window", moving: false };
    const windowConfigs = new Map([["test-window", windowConfig]]);
    const mockDocking = createMockDocking(
      new Map(),
      {},
      () => {},
      new Map(),
      new Set(),
      new Map(),
      windowConfigs,
    );

    const { container } = render(
      <DockingContext.Provider value={mockDocking}>
        <ContextWindowTitleBar id="test-window" />
      </DockingContext.Provider>,
    );
    const bar = container.querySelector(".contextWindowTitle");
    expect(bar).toHaveClass("contextWindowTitle");
    expect(bar).not.toHaveClass("moving");
  });

  test("Always renders the close button", () => {
    const windowConfig: WindowConfig = { title: "My window" };
    const windowConfigs = new Map([["test-window", windowConfig]]);
    const mockDocking = createMockDocking(
      new Map(),
      {},
      () => {},
      new Map(),
      new Set(),
      new Map(),
      windowConfigs,
    );

    render(
      <DockingContext.Provider value={mockDocking}>
        <ContextWindowTitleBar id="test-window" />
      </DockingContext.Provider>,
    );
    const close = screen.getByTestId("mock-title-button-Close");
    expect(close).toHaveAttribute("data-class-name", "contextWindowTitleClose");
    expect(close).toHaveAttribute("data-title", "Close My window");
  });

  test("Uses 'window' in button title when the title is empty", () => {
    const windowConfig: WindowConfig = { title: "" };
    const windowConfigs = new Map([["test-window", windowConfig]]);
    const mockDocking = createMockDocking(
      new Map(),
      {},
      () => {},
      new Map(),
      new Set(),
      new Map(),
      windowConfigs,
    );

    render(
      <DockingContext.Provider value={mockDocking}>
        <ContextWindowTitleBar id="test-window" />
      </DockingContext.Provider>,
    );
    const close = screen.getByTestId("mock-title-button-Close");
    expect(close).toHaveAttribute("data-title", "Close window");
  });

  test("Uses 'window' in button title when the title is whitespace", () => {
    const windowConfig: WindowConfig = { title: "   " };
    const windowConfigs = new Map([["test-window", windowConfig]]);
    const mockDocking = createMockDocking(
      new Map(),
      {},
      () => {},
      new Map(),
      new Set(),
      new Map(),
      windowConfigs,
    );

    render(
      <DockingContext.Provider value={mockDocking}>
        <ContextWindowTitleBar id="test-window" />
      </DockingContext.Provider>,
    );
    const close = screen.getByTestId("mock-title-button-Close");
    expect(close).toHaveAttribute("data-title", "Close window");
  });

  test("Calls closeWindow on context when close button is clicked", async () => {
    const user = userEvent.setup();
    const windowConfig: WindowConfig = { title: "My window" };
    const windowConfigs = new Map([["test-window", windowConfig]]);
    const mockDocking = createMockDocking(
      new Map(),
      {},
      () => {},
      new Map(),
      new Set(),
      new Map(),
      windowConfigs,
    );
    // Wrap closeWindow in jest.fn to test if it was called
    mockDocking.closeWindow = jest.fn(mockDocking.closeWindow);

    render(
      <DockingContext.Provider value={mockDocking}>
        <ContextWindowTitleBar id="test-window" />
      </DockingContext.Provider>,
    );
    const close = screen.getByTestId("mock-title-button-Close");
    await user.click(close);
    expect(mockDocking.closeWindow).toHaveBeenCalledWith("test-window");
  });

  test("Renders dock button when canDock is true", () => {
    const onDock = jest.fn();
    const windowConfig: WindowConfig = { title: "My window", onDock, canDock: true };
    const windowConfigs = new Map([["test-window", windowConfig]]);
    const mockDocking = createMockDocking(
      new Map(),
      {},
      () => {},
      new Map(),
      new Set(),
      new Map(),
      windowConfigs,
    );

    render(
      <DockingContext.Provider value={mockDocking}>
        <ContextWindowTitleBar id="test-window" />
      </DockingContext.Provider>,
    );
    const dock = screen.getByTestId("mock-title-button-Dock");
    expect(dock).toHaveAttribute("data-class-name", "dockButton");
    expect(dock).toHaveAttribute("data-title", "Dock My window");
  });

  test("Renders undock button when canUndock is true", () => {
    const onUndock = jest.fn();
    const windowConfig: WindowConfig = { title: "My window", onUndock, canUndock: true };
    const windowConfigs = new Map([["test-window", windowConfig]]);
    const mockDocking = createMockDocking(
      new Map(),
      {},
      () => {},
      new Map(),
      new Set(),
      new Map(),
      windowConfigs,
    );

    render(
      <DockingContext.Provider value={mockDocking}>
        <ContextWindowTitleBar id="test-window" />
      </DockingContext.Provider>,
    );
    const undock = screen.getByTestId("mock-title-button-Undock");
    expect(undock).toHaveAttribute("data-class-name", "undockButton");
    expect(undock).toHaveAttribute("data-title", "Undock My window");
  });

  test("uses no-op handlers when dock and undock callbacks are absent", () => {
    const windowConfigs = new Map([["test-window", { title: "", canDock: true, canUndock: true }]]);
    const mockDocking = createMockDocking(
      new Map(),
      {},
      () => {},
      new Map(),
      new Set(),
      new Map(),
      windowConfigs,
    );

    render(
      <DockingContext.Provider value={mockDocking}>
        <ContextWindowTitleBar id="test-window" />
      </DockingContext.Provider>,
    );

    expect(() => {
      fireEvent.click(screen.getByTestId("mock-title-button-Dock"));
      fireEvent.click(screen.getByTestId("mock-title-button-Undock"));
    }).not.toThrow();
  });

  test("Calls onMouseDown handler when title bar is clicked", async () => {
    const user = userEvent.setup();
    const onMouseDown = jest.fn();
    const windowConfig: WindowConfig = { title: "My window", onMouseDown };
    const windowConfigs = new Map([["test-window", windowConfig]]);
    const mockDocking = createMockDocking(
      new Map(),
      {},
      () => {},
      new Map(),
      new Set(),
      new Map(),
      windowConfigs,
    );

    const { container } = render(
      <DockingContext.Provider value={mockDocking}>
        <ContextWindowTitleBar id="test-window" />
      </DockingContext.Provider>,
    );
    const titleBar = container.querySelector(".contextWindowTitle");
    if (titleBar) {
      await user.click(titleBar);
    }
    expect(onMouseDown).toHaveBeenCalled();
  });

  test("Falls back to an id-based title when the window config is not found", () => {
    const mockDocking = createMockDocking(
      new Map(),
      {},
      () => {},
      new Map(),
      new Set(),
      new Map(),
      new Map(),
    );

    render(
      <DockingContext.Provider value={mockDocking}>
        <ContextWindowTitleBar id="nonexistent-window" />
      </DockingContext.Provider>,
    );

    expect(screen.getByText("nonexistent-window")).toHaveClass("contextWindowTitleText");
    expect(screen.getByTitle("nonexistent-window")).toBeInTheDocument();
    expect(screen.getByTestId("mock-title-button-Close")).toHaveAttribute(
      "data-title",
      "Close nonexistent-window",
    );
  });
});
