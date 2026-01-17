import { act, render, screen, waitFor } from "@testing-library/react";
import { AutoHeight } from "./AutoHeight";

describe("AutoHeight Component", () => {
  let rafMock: jest.SpyInstance;
  let cancelRafMock: jest.SpyInstance;

  function setupRafMocks() {
    let rafCb: FrameRequestCallback | null = null;
    let rafId = 1;
    rafMock = jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafCb = cb;
      return rafId++;
    });
    cancelRafMock = jest.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    return { rafMock, cancelRafMock, getRafCb: () => rafCb };
  }

  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
      configurable: true,
      get() {
        return this.children?.[0]?.dataset?.height !== undefined
          ? parseInt(this.children![0].dataset.height)
          : undefined;
      },
    });
    // Mock ResizeObserver to avoid errors in tests
    window.ResizeObserver = class {
      observe = jest.fn();
      unobserve = jest.fn();
      disconnect = jest.fn();
    };
    setupRafMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    rafMock?.mockRestore();
    cancelRafMock?.mockRestore();
    jest.clearAllMocks();
  });

  test("renders children correctly", () => {
    render(
      <AutoHeight>
        <div
          data-testid="child"
          data-height="100"
        >
          Child Content
        </div>
      </AutoHeight>,
    );
    const child = screen.getByTestId("child");
    expect(child).toBeInTheDocument();
    expect(child).toHaveTextContent("Child Content");
  });

  test("applies custom styles and attributes", () => {
    render(
      <AutoHeight
        style={{ backgroundColor: "red" }}
        data-testid="wrapper"
      >
        <div>Content</div>
      </AutoHeight>,
    );
    const wrapper = screen.getByTestId("wrapper");
    expect(wrapper).toHaveStyle("background-color: rgb(255, 0, 0)");
  });

  test("handles hide prop correctly on initial render", async () => {
    const { container } = await act(async () =>
      render(
        <AutoHeight hide>
          <div
            data-testid="child"
            data-height="1000"
          >
            Hidden Content
          </div>
        </AutoHeight>,
      ),
    );
    const wrapper = container.querySelector(".autoHeightWrapper");
    expect(wrapper).toHaveStyle("display: none");
  });

  test("animates opening from hidden state", async () => {
    const { container, rerender } = await act(async () =>
      render(
        <AutoHeight hide>
          <div
            data-testid="child"
            data-height="100"
          >
            Content
          </div>
        </AutoHeight>,
      ),
    );

    await act(async () =>
      rerender(
        <AutoHeight>
          <div
            data-testid="child"
            data-height="100"
          >
            Content
          </div>
        </AutoHeight>,
      ),
    );

    const wrapper = container.querySelector(".autoHeightWrapper");

    // Should be visible
    expect(wrapper).not.toHaveStyle("display: none");

    // Run RAF callbacks to set initial height of 1px
    await act(async () => jest.runAllTimers());

    // Run RAF callbacks again to set target height
    await act(async () => jest.runAllTimers());

    expect(wrapper).toHaveStyle("height: 100px");
  });

  test("animates closing to hidden state", async () => {
    const { container, rerender } = await act(async () =>
      render(
        <AutoHeight>
          <div
            data-testid="child"
            data-height="100"
          >
            Content
          </div>
        </AutoHeight>,
      ),
    );

    const wrapper = container.querySelector(".autoHeightWrapper");

    // Run initial RAF callbacks
    await act(async () => jest.runAllTimers());

    await act(async () =>
      rerender(
        <AutoHeight hide>
          <div
            data-testid="child"
            data-height="100"
          >
            Content
          </div>
        </AutoHeight>,
      ),
    );

    // Should collapse to 1px
    expect(wrapper).toHaveStyle("height: 1px");

    // Run timeout to hide display
    await act(async () => jest.runAllTimers());

    expect(wrapper).toHaveStyle("display: none");
  });

  test("updates content on children change", () => {
    const { rerender } = render(
      <AutoHeight>
        <div data-testid="child">Initial Content</div>
      </AutoHeight>,
    );
    const child = screen.getByTestId("child");
    expect(child).toHaveTextContent("Initial Content");

    rerender(
      <AutoHeight>
        <div data-testid="another-child">Updated Content</div>
      </AutoHeight>,
    );
    const updatedChild = screen.getByTestId("another-child");
    expect(updatedChild).toHaveTextContent("Updated Content");
  });

  test("applies transition duration", () => {
    render(
      <AutoHeight
        duration={500}
        data-testid="wrapper"
      >
        <div>Content</div>
      </AutoHeight>,
    );
    const wrapper = screen.getByTestId("wrapper");
    expect(wrapper).toHaveStyle("transition-duration: 500ms");
  });

  test("cancels pending close timeout when opening", async () => {
    const { container, rerender } = await act(async () =>
      render(
        <AutoHeight>
          <div
            data-testid="child"
            data-height="100"
          >
            Content
          </div>
        </AutoHeight>,
      ),
    );

    const wrapper = container.querySelector(".autoHeightWrapper");

    // Run initial RAF callbacks
    await act(async () => jest.runAllTimers());

    // Hide
    await act(async () =>
      rerender(
        <AutoHeight hide>
          <div
            data-testid="child"
            data-height="100"
          >
            Content
          </div>
        </AutoHeight>,
      ),
    );

    // Immediately show before timeout executes
    await act(async () =>
      rerender(
        <AutoHeight>
          <div
            data-testid="child"
            data-height="100"
          >
            Content
          </div>
        </AutoHeight>,
      ),
    );

    // Run RAF callbacks
    await act(async () => jest.runAllTimers());

    // Should not be hidden since we cancelled the close timeout
    expect(wrapper).not.toHaveStyle("display: none");
  });

  test("cancels pending close timeout when opening again", async () => {
    const clearTimeoutSpy = jest.spyOn(window, "clearTimeout");

    const { container, rerender } = render(
      <AutoHeight>
        <div
          data-testid="child"
          data-height="120"
        >
          Content
        </div>
      </AutoHeight>,
    );

    // Complete initial opening sequence
    await act(async () => jest.runAllTimers());

    // Hide to schedule close timeout
    await act(async () =>
      rerender(
        <AutoHeight hide>
          <div
            data-testid="child"
            data-height="120"
          >
            Content
          </div>
        </AutoHeight>,
      ),
    );

    // Re-open before the close timeout fires
    await act(async () =>
      rerender(
        <AutoHeight>
          <div
            data-testid="child"
            data-height="120"
          >
            Content
          </div>
        </AutoHeight>,
      ),
    );

    // Should cancel the pending timeout
    expect(clearTimeoutSpy).toHaveBeenCalled();
    const wrapper = container.querySelector(".autoHeightWrapper");
    expect(wrapper).not.toHaveStyle("display: none");
    clearTimeoutSpy.mockRestore();
  });

  test("cancels pending RAF when closing during animation", async () => {
    const { container, rerender } = await act(async () =>
      render(
        <AutoHeight>
          <div
            data-testid="child"
            data-height="100"
          >
            Content
          </div>
        </AutoHeight>,
      ),
    );

    const wrapper = container.querySelector(".autoHeightWrapper");

    // Hide before RAF callbacks complete
    await act(async () =>
      rerender(
        <AutoHeight hide>
          <div
            data-testid="child"
            data-height="100"
          >
            Content
          </div>
        </AutoHeight>,
      ),
    );

    // Run timers
    await act(async () => jest.runAllTimers());

    // Should be hidden
    expect(wrapper).toHaveStyle("display: none");
  });

  test("changes height on children resize", async () => {
    const resizeObserverCallback = jest.fn();
    window.ResizeObserver = class {
      constructor(callback: ResizeObserverCallback) {
        resizeObserverCallback(callback);
      }
      observe = jest.fn();
      unobserve = jest.fn();
      disconnect = jest.fn();
    };

    const { container, rerender } = await act(async () =>
      render(
        <AutoHeight>
          <div
            data-testid="child"
            data-height="100"
          >
            Initial Content
          </div>
        </AutoHeight>,
      ),
    );

    const wrapper = container.querySelector(".autoHeightWrapper");

    // Run RAF callbacks to set initial height
    await act(async () => jest.runAllTimers());

    // Get the ResizeObserver callback and trigger it
    const callback = resizeObserverCallback.mock.calls[0][0];
    const inner = container.querySelector(".autoHeightInner");

    await act(async () => {
      callback([{ target: inner }]);
    });

    expect(wrapper).toHaveStyle("height: 100px");

    // Update child height
    await act(async () =>
      rerender(
        <AutoHeight>
          <div
            data-testid="child"
            data-height="200"
          >
            Updated Content
          </div>
        </AutoHeight>,
      ),
    );

    await act(async () => {
      callback([{ target: inner }]);
    });

    expect(wrapper).toHaveStyle("height: 200px");
  });

  test("does not update height when panelVisible is false", async () => {
    const resizeObserverCallback = jest.fn();
    window.ResizeObserver = class {
      constructor(callback: ResizeObserverCallback) {
        resizeObserverCallback(callback);
      }
      observe = jest.fn();
      unobserve = jest.fn();
      disconnect = jest.fn();
    };

    const { container } = await act(async () =>
      render(
        <AutoHeight hide>
          <div
            data-testid="child"
            data-height="100"
          >
            Content
          </div>
        </AutoHeight>,
      ),
    );

    const wrapper = container.querySelector(".autoHeightWrapper");

    // Get the ResizeObserver callback
    const callback = resizeObserverCallback.mock.calls[0][0];
    const inner = container.querySelector(".autoHeightInner");

    // Try to trigger resize while hidden
    await act(async () => {
      callback([{ target: inner }]);
    });

    // Height should be auto since panelVisible is false and height state remains null
    expect(wrapper).toHaveStyle("height: auto");
  });

  test("cleans up timers on unmount during hide", async () => {
    const timeoutSpy = jest.spyOn(window, "setTimeout");

    const { unmount, rerender } = await act(async () =>
      render(
        <AutoHeight>
          <div
            data-testid="child"
            data-height="100"
          >
            Content
          </div>
        </AutoHeight>,
      ),
    );

    // Run RAF callbacks
    await act(async () => jest.runAllTimers());

    // Hide to set up a timeout
    await act(async () =>
      rerender(
        <AutoHeight hide>
          <div
            data-testid="child"
            data-height="100"
          >
            Content
          </div>
        </AutoHeight>,
      ),
    );

    // Unmount before timeout executes
    await act(async () => {
      unmount();
    });

    expect(timeoutSpy).toHaveBeenCalled();
    timeoutSpy.mockRestore();
  });

  test("cancels pending RAF when hiding before opening RAF fires", async () => {
    setupRafMocks();
    const { rerender } = render(
      <AutoHeight hide>
        <div
          data-testid="child"
          data-height="180"
        >
          Content
        </div>
      </AutoHeight>,
    );

    // Start opening
    await act(async () =>
      rerender(
        <AutoHeight>
          <div
            data-testid="child"
            data-height="180"
          >
            Content
          </div>
        </AutoHeight>,
      ),
    );

    // Before RAF fires, hide again to trigger cancellation
    await act(async () =>
      rerender(
        <AutoHeight hide>
          <div
            data-testid="child"
            data-height="180"
          >
            Content
          </div>
        </AutoHeight>,
      ),
    );

    expect(cancelRafMock).toHaveBeenCalled();
  });

  test("executes RAF callbacks to expand height", async () => {
    const { getRafCb } = setupRafMocks();
    const { container, rerender } = render(
      <AutoHeight hide>
        <div
          data-testid="child"
          data-height="160"
        >
          Content
        </div>
      </AutoHeight>,
    );

    // Start opening
    await act(async () =>
      rerender(
        <AutoHeight>
          <div
            data-testid="child"
            data-height="160"
          >
            Content
          </div>
        </AutoHeight>,
      ),
    );

    const wrapper = container.querySelector(".autoHeightWrapper")!;
    // Initially auto
    expect(wrapper).toHaveStyle("height: auto");

    // Fire outer RAF callback (collapses to 1px and schedules inner)
    await act(async () => {
      const cb = getRafCb();
      cb?.(performance.now());
    });
    await waitFor(() => expect(wrapper).toHaveStyle("height: 1px"));

    // Fire inner RAF callback (expands to content height)
    await act(async () => {
      const cb2 = getRafCb();
      cb2?.(performance.now());
    });
    await waitFor(() => expect(wrapper).toHaveStyle("height: 160px"));
  });
});
