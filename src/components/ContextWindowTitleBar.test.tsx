import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContextWindowTitleBar } from "./ContextWindowTitleBar";
import type { DockEdge, WindowConfig } from "./interface";

vi.mock("./ContextWindowTitleButton");

type TitleBarWindow = React.ComponentProps<typeof ContextWindowTitleBar>["window"];

const renderTitleBar = (windowConfig: WindowConfig, overrides: Partial<TitleBarWindow> = {}) =>
  render(
    <ContextWindowTitleBar
      window={{
        windowConfig,
        isDocked: false,
        onTitleMouseDown: vi.fn(),
        onDock: vi.fn(),
        onUndock: vi.fn(),
        ...overrides,
      }}
    />,
  );

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
      const { container } = renderTitleBar({ title: "My window", allowUndock }, { isDocked });
      const bar = container.querySelector(".contextWindowTitle");
      expect(bar?.classList.contains("undockDisabled")).toBe(expectedDisabled);
    },
  );

  test("renders the title text with a tooltip", () => {
    renderTitleBar({ title: "My window" });
    const text = screen.getByText("My window");
    expect(text).toHaveClass("contextWindowTitleText");
    expect(text).toHaveAttribute("title", "My window");
  });

  test("renders titleElement in place of the title text", () => {
    renderTitleBar({
      title: "My window",
      titleElement: <b data-testid="custom-title">Custom</b>,
    });
    expect(screen.getByTestId("custom-title")).toBeInTheDocument();
    expect(screen.queryByText("My window")).not.toBeInTheDocument();
    expect(screen.getByTitle("My window")).toContainElement(screen.getByTestId("custom-title"));
  });

  test.each([true, false])("reflects moving=%s from the window config", (moving) => {
    const { container } = renderTitleBar({ title: "My window", moving });
    const bar = container.querySelector(".contextWindowTitle");
    expect(bar).toHaveClass("contextWindowTitle");
    expect(bar?.classList.contains("moving")).toBe(moving);
  });

  test("does not render the close button when canClose is absent", () => {
    renderTitleBar({ title: "My window" });
    expect(screen.queryByTestId("mock-title-button-Close")).not.toBeInTheDocument();
  });

  test("renders the close button when canClose is true", () => {
    renderTitleBar({ title: "My window", canClose: true });
    const close = screen.getByTestId("mock-title-button-Close");
    expect(close).toHaveAttribute("data-class-name", "contextWindowTitleClose");
    expect(close).toHaveAttribute("data-title", "Close My window");
  });

  test.each(["", "   "])("uses 'window' in button titles for title=%s", (title) => {
    renderTitleBar({ title, canClose: true });
    expect(screen.getByTestId("mock-title-button-Close")).toHaveAttribute(
      "data-title",
      "Close window",
    );
  });

  test("calls the hook-owned close action", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderTitleBar({ title: "My window", canClose: true }, { onClose });
    await user.click(screen.getByTestId("mock-title-button-Close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("renders dock button and invokes the hook-owned dock action", () => {
    const onDock = vi.fn();
    renderTitleBar({ title: "My window", canDock: true }, { onDock });
    const dock = screen.getByTestId("mock-title-button-Dock");
    expect(dock).toHaveAttribute("data-class-name", "dockButton");
    expect(dock).toHaveAttribute("data-title", "Dock My window");
    fireEvent.click(dock);
    expect(onDock).toHaveBeenCalledWith("right");
  });

  test.each<[DockEdge | undefined, string]>([
    [undefined, "M3 7.5h3v-2L9 8"],
    ["right", "M3 7.5h3v-2L9 8"],
    ["bottom", "m5.5-7v3h-2L8 10"],
    ["left", "m7 4.5h-3v-2L7 8"],
    ["top", "m5.5 6V9h-2L8 6"],
  ])("renders the dock icon and action for edge %s", (defaultDockEdge, arrowPath) => {
    const onDock = vi.fn();
    renderTitleBar({ title: "My window", canDock: true, defaultDockEdge }, { onDock });
    const dock = screen.getByTestId("mock-title-button-Dock");
    const icon = dock.firstElementChild;
    expect(icon?.tagName).toBe("svg");
    expect(icon).toHaveAttribute("width", "14");
    expect(icon?.querySelector("path")?.getAttribute("d")).toContain(arrowPath);
    fireEvent.click(dock);
    expect(onDock).toHaveBeenCalledWith(defaultDockEdge ?? "right");
  });

  test("renders undock button and invokes the hook-owned undock action", () => {
    const onUndock = vi.fn();
    renderTitleBar({ title: "My window", canUndock: true }, { onUndock });
    const undock = screen.getByTestId("mock-title-button-Undock");
    expect(undock).toHaveAttribute("data-class-name", "undockButton");
    expect(undock).toHaveAttribute("data-title", "Undock My window");
    fireEvent.click(undock);
    expect(onUndock).toHaveBeenCalledTimes(1);
  });

  test("supports a missing close callback", () => {
    renderTitleBar({ title: "", canClose: true });
    expect(() => fireEvent.click(screen.getByTestId("mock-title-button-Close"))).not.toThrow();
  });

  test("calls the hook-owned mouse-down handler on the title bar", async () => {
    const user = userEvent.setup();
    const onTitleMouseDown = vi.fn();
    const { container } = renderTitleBar({ title: "My window" }, { onTitleMouseDown });
    await user.click(container.querySelector(".contextWindowTitle")!);
    expect(onTitleMouseDown).toHaveBeenCalled();
  });

  test("isolates custom title controls from title-bar drag handlers", () => {
    const onTitleMouseDown = vi.fn();
    const onUndo = vi.fn();
    renderTitleBar(
      {
        title: "My window",
        canDock: true,
        canClose: true,
        titleBarButtons: <button onClick={onUndo}>Undo</button>,
      },
      { onTitleMouseDown },
    );
    const undo = screen.getByRole("button", { name: "Undo" });
    expect(screen.getByTestId("mock-title-button-Dock").nextElementSibling).toBe(
      undo.parentElement,
    );
    expect(screen.getByTestId("mock-title-button-Close").previousElementSibling).toBe(
      undo.parentElement,
    );
    fireEvent.pointerDown(undo);
    fireEvent.mouseDown(undo);
    fireEvent.click(undo);
    expect(onTitleMouseDown).not.toHaveBeenCalled();
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  test.each([undefined, null])("omits the custom control wrapper for %s", (titleBarButtons) => {
    const { container } = renderTitleBar({ title: "My window", titleBarButtons });
    expect(container.querySelector(".contextWindowTitleButtons")).not.toBeInTheDocument();
  });
});
