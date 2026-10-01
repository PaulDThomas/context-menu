import { act, fireEvent, render, screen } from "@testing-library/react";
import { DockingContext } from "./DockingContext";
import { DockPanelTabButton } from "./DockPanelTabButton";
import type { DockingContextType } from "./interface";

describe("DockPanelTabButton", () => {
  const renderTab = (
    overrides: Partial<DockingContextType> = {},
    props: {
      windowId?: string;
      edge?: "top" | "right" | "bottom" | "left";
      isActive?: boolean;
    } = {},
  ) => {
    const context = {
      dock: jest.fn(),
      undock: jest.fn(),
      getDockedWindow: jest.fn(),
      getWindowsOnEdge: jest.fn(() => []),
      setActiveWindowOnEdge: jest.fn(),
      getActiveWindowOnEdge: jest.fn(() => null),
      setPanelContentHost: jest.fn(),
      getPanelContentHost: jest.fn(() => null),
      isEdgeCollapsed: jest.fn(() => false),
      toggleEdgeCollapse: jest.fn(),
      registerWindow: jest.fn(),
      unregisterWindow: jest.fn(),
      registerWindowActions: jest.fn(),
      unregisterWindowActions: jest.fn(),
      closeWindow: jest.fn(),
      requestUndock: jest.fn(),
      raiseWindow: jest.fn(),
      getWindowZIndex: jest.fn(() => null),
      getPanelZIndex: jest.fn(() => null),
      getPreDockRect: jest.fn(() => null),
      startDockDrag: jest.fn(),
      setDockDragEdge: jest.fn(),
      endDockDrag: jest.fn(),
      ...overrides,
    } as DockingContextType;
    render(
      <DockingContext.Provider value={context}>
        <DockPanelTabButton
          windowId={props.windowId ?? "win"}
          edge={props.edge ?? "left"}
          isActive={props.isActive ?? false}
        />
      </DockingContext.Provider>,
    );
    return context;
  };

  test("Inactive tab shows the window id", () => {
    renderTab({}, { windowId: "win-1" });
    const button = screen.getByRole("button", { name: "win-1" });
    expect(button).toHaveAttribute("title", "Activate win-1");
    expect(button).toHaveClass("dockTabButton");
    expect(button).not.toHaveClass("activeDockTabButton");
  });

  test("Active tab has the active class", () => {
    renderTab({}, { windowId: "win-2", isActive: true });
    expect(screen.getByRole("button", { name: "win-2" })).toHaveClass(
      "dockTabButton activeDockTabButton",
    );
  });

  test("Calls onClick when clicked", () => {
    const context = renderTab({}, { windowId: "win-3" });
    fireEvent.click(screen.getByRole("button", { name: "win-3" }));
    expect(context.setActiveWindowOnEdge).toHaveBeenCalledWith("left", "win-3");
  });

  test("Context menu can show, close and undock the related window", async () => {
    jest.useFakeTimers();
    const context = renderTab({}, { windowId: "win-menu" });

    const button = screen.getByRole("button", { name: "win-menu" });
    fireEvent.contextMenu(button, { pageX: 10, pageY: 10 });
    await act(async () => {
      jest.runOnlyPendingTimers();
    });

    expect(screen.getByText("Show")).toBeVisible();
    expect(screen.getByText("Close")).toBeVisible();
    expect(screen.getByText("Undock")).toBeVisible();

    fireEvent.mouseDown(screen.getByText("Show"));
    fireEvent.mouseDown(screen.getByText("Close"));
    fireEvent.mouseDown(screen.getByText("Undock"));

    expect(context.setActiveWindowOnEdge).toHaveBeenCalledWith("left", "win-menu");
    expect(context.closeWindow).toHaveBeenCalledWith("win-menu");
    expect(context.requestUndock).toHaveBeenCalledWith("win-menu");
    jest.useRealTimers();
  });
});
