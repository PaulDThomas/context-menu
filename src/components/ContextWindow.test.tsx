import { act, fireEvent, render, screen } from "@testing-library/react";
import { useContext } from "react";
import { ContextWindow, type ContextWindowHandle, type ContextWindowProps } from "./ContextWindow";
import { DockingContext, DockingProvider } from "./DockingContext";
import { createMockDocking } from "./__mocks__/mockDocking";
import type { DockEdge, DockingContextType } from "./interface";

describe("ContextWindow", () => {
  let docking: DockingContextType;

  const CaptureDocking = (): null => {
    docking = useContext(DockingContext)!;
    return null;
  };

  const renderWindow = (
    props: Partial<ContextWindowProps> = {},
    windowRef?: React.RefObject<ContextWindowHandle | null>,
  ) => {
    const windowProps: ContextWindowProps = {
      id: "test-window",
      title: "Test window",
      visible: true,
      children: <button>Window content</button>,
      ...props,
    };
    return render(
      <DockingProvider>
        <CaptureDocking />
        <ContextWindow
          {...windowProps}
          ref={windowRef}
        />
      </DockingProvider>,
    );
  };

  test("opens in the configured dock panel and reflects active-window state", () => {
    renderWindow({ initialDockEdge: "left", titleElement: <strong>Custom title</strong> });

    expect(docking.getDockedWindow("test-window")).toMatchObject({ edge: "left" });
    expect(screen.getByRole("separator", { name: "Resize left dock panel" })).toBeInTheDocument();
    expect(screen.getByText("Custom title")).toBeInTheDocument();
    expect(document.getElementById("test-window")).toHaveStyle({
      display: "flex",
      width: "100%",
      height: "100%",
    });
  });

  test("exposes imperative methods and keeps hidden windows undocked", () => {
    const windowRef = { current: null } as React.RefObject<ContextWindowHandle | null>;
    renderWindow({ visible: false }, windowRef);
    expect(windowRef.current).not.toBeNull();
    expect(windowRef.current?.dock).toEqual(expect.any(Function));

    act(() => {
      windowRef.current?.pushToTop();
      windowRef.current?.dock("bottom");
    });

    expect(docking.getDockedWindow("test-window")).toBeUndefined();
    expect(document.getElementById("test-window")).toBeNull();
  });

  test.each<DockEdge>(["right", "bottom", "left", "top"])(
    "the dock button targets the default %s edge after floating and undocking",
    (edge) => {
      renderWindow({ defaultDockEdge: edge });
      expect(docking.getDockedWindow("test-window")).toBeUndefined();

      fireEvent.click(screen.getByRole("button", { name: "Dock" }));
      expect(docking.getDockedWindow("test-window")).toMatchObject({ edge });

      fireEvent.click(screen.getByRole("button", { name: "Undock" }));
      fireEvent.click(screen.getByRole("button", { name: "Dock" }));
      expect(docking.getDockedWindow("test-window")).toMatchObject({ edge });
    },
  );

  test("uses the document body when a docked edge has no portal host", () => {
    const dockedWindow = { id: "hostless-window", edge: "left" as const, order: 0 };
    const mockDocking: DockingContextType = createMockDocking(
      new Map([[dockedWindow.id, dockedWindow]]),
      {
        getWindowConfig: () => ({ title: "Hostless window", windowVisible: true }),
        getPanelContentHost: () => null,
      },
    );

    render(
      <DockingContext.Provider value={mockDocking}>
        <ContextWindow
          id="hostless-window"
          title="Hostless window"
          visible
        >
          Hostless content
        </ContextWindow>
      </DockingContext.Provider>,
    );

    expect(document.getElementById("hostless-window")?.parentElement).toBe(document.body);
  });

  test("does not apply floating position to a window that is already docked", () => {
    const dockedWindow = { id: "pre-docked-window", edge: "top" as const, order: 0 };
    const mockDocking: DockingContextType = createMockDocking(
      new Map([[dockedWindow.id, dockedWindow]]),
      {
        getWindowConfig: () => ({ title: "Pre-docked", windowVisible: false }),
        getPanelContentHost: () => null,
      },
    );

    render(
      <DockingContext.Provider value={mockDocking}>
        <ContextWindow
          id="pre-docked-window"
          title="Pre-docked"
          visible
        >
          Pre-docked content
        </ContextWindow>
      </DockingContext.Provider>,
    );

    expect(document.getElementById("pre-docked-window")?.style.left).toBe("");
    expect(document.getElementById("pre-docked-window")?.style.top).toBe("");
  });

  test("closes through its title bar action and skips hidden rendering", () => {
    const onClose = jest.fn();
    const { rerender } = renderWindow({ onClose });
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(
      <DockingProvider>
        <CaptureDocking />
        <ContextWindow
          id="test-window"
          title="Test window"
          visible={false}
          onClose={onClose}
        >
          <button>Window content</button>
        </ContextWindow>
      </DockingProvider>,
    );
    expect(document.getElementById("test-window")).toBeNull();
  });
});
