import { fireEvent, render, screen } from "@testing-library/react";
import { DockPanel } from "./DockPanel";
import { DockingContext } from "./DockingContext";
import type { DockedWindow, DockingContextType } from "./interface";

const buildDockedWindow = (
  id: string,
  edge: DockedWindow["edge"],
  order: number,
): DockedWindow => ({
  id,
  edge,
  order,
  stackDirection: "vertical",
  isCollapsed: false,
});

describe("DockPanel", () => {
  test("does not render when no windows are docked on the target edge", () => {
    const contextValue: DockingContextType = {
      state: {
        dockedWindows: new Map(),
        collapsedEdges: new Set(),
      },
      dock: () => {},
      undock: () => {},
      toggleCollapse: () => {},
      getDockedWindow: () => undefined,
      getWindowsOnEdge: () => [],
      isEdgeCollapsed: () => false,
      toggleEdgeCollapse: () => {},
    };

    const { container } = render(
      <DockingContext.Provider value={contextValue}>
        <DockPanel edge="left" />
      </DockingContext.Provider>,
    );

    expect(container.firstChild).toBeNull();
  });

  test("renders tabs and activates selected docked window", () => {
    const setActiveWindowOnEdge = jest.fn();
    const windows = [
      buildDockedWindow("window-a", "right", 0),
      buildDockedWindow("window-b", "right", 1),
    ];

    const contextValue: DockingContextType = {
      state: {
        dockedWindows: new Map(
          windows.map((window): [string, DockedWindow] => [window.id, window]),
        ),
        collapsedEdges: new Set(),
      },
      dock: () => {},
      undock: () => {},
      toggleCollapse: () => {},
      setActiveWindowOnEdge,
      getActiveWindowOnEdge: () => "window-a",
      setPanelContentHost: () => {},
      getPanelContentHost: () => null,
      getDockedWindow: (id) => windows.find((window) => window.id === id),
      getWindowsOnEdge: (edge) => windows.filter((window) => window.edge === edge),
      isEdgeCollapsed: () => false,
      toggleEdgeCollapse: () => {},
    };

    render(
      <DockingContext.Provider value={contextValue}>
        <DockPanel edge="right" />
      </DockingContext.Provider>,
    );

    const firstButton = screen.getByRole("button", { name: "window-a" });
    const secondButton = screen.getByRole("button", { name: "window-b" });

    expect(firstButton.className).toContain("activeDockTabButton");
    expect(secondButton.className).not.toContain("activeDockTabButton");

    fireEvent.click(secondButton);

    expect(setActiveWindowOnEdge).toHaveBeenCalledWith("right", "window-b");
  });
});
