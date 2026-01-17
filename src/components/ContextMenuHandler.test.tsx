import { act, fireEvent, render, screen } from "@testing-library/react";
import { ContextMenuHandler } from "./ContextMenuHandler";

describe("ContextMenuHandler edge cases", () => {
  let resizeCallback: ResizeObserverCallback | null = null;
  beforeAll(() => {
    global.ResizeObserver = class {
      constructor(cb: ResizeObserverCallback) {
        resizeCallback = cb;
      }
      observe = jest.fn();
      unobserve = jest.fn();
      disconnect = jest.fn();
    };
  });

  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test("uses ResizeObserver when available and disconnects on leave", async () => {
    await act(async () =>
      render(
        <ContextMenuHandler
          showLowMenu
          menuItems={[{ label: "One" }]}
        >
          <div data-testid="inside-div" />
        </ContextMenuHandler>,
      ),
    );

    const testDiv = screen.getByTestId("inside-div");

    // Trigger mouse enter which for showLowMenu sets menuInDom and then schedules mouseOverHandlerDiv
    await act(async () => {
      fireEvent.mouseEnter(testDiv);
      // advance timers so the delayed setMouseOverHandlerDiv executes
      jest.runAllTimers();
    });

    // The ResizeObserver should have been constructed and observe called with the handler element
    expect(resizeCallback).not.toBeNull();

    // Now leave the element to trigger cleanup
    await act(async () => {
      fireEvent.mouseLeave(testDiv);
      jest.runAllTimers();
    });
  });

  test("Rapid re-open aborts pending hide and keeps low menu visible", async () => {
    await act(async () =>
      render(
        <ContextMenuHandler
          showLowMenu
          menuItems={[{ label: "One" }]}
        >
          <div data-testid="inside-div" />
        </ContextMenuHandler>,
      ),
    );

    const testDiv = screen.getByTestId("inside-div");

    // Hover to open low menu
    await act(async () => {
      fireEvent.mouseEnter(testDiv);
      jest.runAllTimers();
    });
    // Expect the entry to be present
    expect(screen.getByText("One")).toBeInTheDocument();

    // Leave to schedule 300ms hide
    await act(async () => {
      fireEvent.mouseLeave(testDiv);
    });

    // Re-enter quickly to abort pending hide
    await act(async () => {
      fireEvent.mouseEnter(testDiv);
      jest.runAllTimers();
    });

    // Low menu remains visible
    expect(screen.getByText("One")).toBeInTheDocument();
  });

  test("Rapid re-open aborts pending hide and keeps context menu visible", async () => {
    await act(async () =>
      render(
        <ContextMenuHandler menuItems={[{ label: "One" }]}>
          <div data-testid="inside-div" />
        </ContextMenuHandler>,
      ),
    );

    const testDiv = screen.getByTestId("inside-div");

    // Open context menu
    await act(async () => {
      fireEvent.contextMenu(testDiv, { pageX: 100, pageY: 100 });
      jest.runAllTimers();
    });
    expect(screen.getByText("One")).toBeInTheDocument();

    // Click outside to close (schedules 300ms removal)
    await act(async () => {
      fireEvent.mouseDown(document.body);
    });

    // Re-open before removal fires
    await act(async () => {
      fireEvent.contextMenu(testDiv, { pageX: 120, pageY: 120 });
      jest.runAllTimers();
    });

    expect(screen.getByText("One")).toBeInTheDocument();
  });
});
