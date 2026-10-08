import { act, fireEvent, render, screen } from "@testing-library/react";
import * as dockingHook from "../functions/useDocking";
import { defaultDocking } from "./__mocks__/mockDocking";
import { DockPanelTabButton } from "./DockPanelTabButton";
import type { DockingWindowController } from "./interface";

describe("DockPanelTabButton", () => {
  afterEach(() => jest.restoreAllMocks());

  test("Inactive tab shows the window id", () => {
    jest.spyOn(dockingHook, "useDocking").mockReturnValue({
      ...defaultDocking,
      getWindowConfig: () => ({ title: "win-1" }),
    });
    render(
      <DockPanelTabButton
        windowId="win-1"
        edge="left"
        isActive={false}
      />,
    );
    const button = screen.getByRole("button", { name: "win-1" });
    expect(button).toHaveAttribute("title", "Activate win-1");
    expect(button).toHaveClass("dockTabButton");
    expect(button).not.toHaveClass("activeDockTabButton");
  });

  test("Active tab has the active class", () => {
    jest.spyOn(dockingHook, "useDocking").mockReturnValue({
      ...defaultDocking,
      getWindowConfig: () => ({ title: "win-2" }),
    });
    render(
      <DockPanelTabButton
        windowId="win-2"
        edge="left"
        isActive
      />,
    );
    expect(screen.getByRole("button", { name: "win-2" })).toHaveClass(
      "dockTabButton activeDockTabButton",
    );
  });

  test("Calls onClick when clicked", () => {
    const dispatch = jest.fn();
    jest.spyOn(dockingHook, "useDocking").mockReturnValue({
      ...defaultDocking,
      dispatch,
      getWindowConfig: () => ({ title: "win-3" }),
    });
    render(
      <DockPanelTabButton
        windowId="win-3"
        edge="left"
        isActive={false}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "win-3" }));
    expect(dispatch).toHaveBeenCalledWith({
      type: "activateWindowOnEdge",
      edge: "left",
      id: "win-3",
    });
  });

  test("Context menu can show, close and undock the related window", async () => {
    jest.useFakeTimers();
    const onUndock = jest.fn();
    const controller: DockingWindowController = { windowRef: { current: null }, onUndock };
    const dispatch = jest.fn();
    jest.spyOn(dockingHook, "useDocking").mockReturnValue({
      ...defaultDocking,
      dispatch,
      getWindowConfig: () => ({ title: "win-menu" }),
      getWindowController: () => controller,
    });
    render(
      <DockPanelTabButton
        windowId="win-menu"
        edge="left"
        isActive={false}
      />,
    );

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

    expect(dispatch).toHaveBeenCalledWith({
      type: "activateWindowOnEdge",
      edge: "left",
      id: "win-menu",
    });
    expect(onUndock).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });
});
