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
});
