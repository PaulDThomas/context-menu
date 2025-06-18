import { act, fireEvent, render, screen } from "@testing-library/react";
import { AutoHeight } from "./AutoHeight";

describe("AutoHeight Component", () => {
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
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
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
    expect(wrapper).toHaveStyle("background-color: red");
  });

  test("handles hide prop correctly", async () => {
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
    const child = screen.queryByTestId("child");
    expect(child).not.toBeInTheDocument();
    const wrapper = container.querySelector(".autoHeightWrapper");
    await act(async () => fireEvent(wrapper!, new Event("transitionend")));
    expect(screen.queryByText("Hidden Content")).not.toBeInTheDocument();
    expect(wrapper).toHaveStyle("height: 1px");
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

  test("changes height on children resize", async () => {
    const { rerender } = await act(async () =>
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
    const child = screen.getByTestId("child");
    const wrapper = child.closest(".autoHeightWrapper");
    await act(async () => fireEvent(wrapper!, new Event("transitionend")));
    await act(async () => jest.runAllTimers());
    expect(wrapper).toHaveStyle("height: 100px");

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
    await act(async () => fireEvent(wrapper!, new Event("transitionend")));
    await act(async () => jest.runAllTimers());
    expect(wrapper).toHaveStyle("height: 200px");
  });

  test("trigger ResizeObserver", async () => {
    const resizeObserverMock = jest.fn((callback) => {
      // Simulate ResizeObserver callback execution
      callback([{ target: this }]);
    });

    window.ResizeObserver = class {
      constructor(callback: ResizeObserverCallback) {
        resizeObserverMock(callback);
      }
      observe = jest.fn();
      unobserve = jest.fn();
      disconnect = jest.fn();
    };

    const { rerender } = await act(async () =>
      render(
        <AutoHeight data-testid="autoHeight">
          <div
            data-testid="child"
            data-height="150"
          >
            Resizable Content
          </div>
        </AutoHeight>,
      ),
    );
    const wrapper = screen.getByTestId("autoHeight");
    await act(async () => fireEvent(wrapper, new Event("transitionend")));
    await act(async () => jest.runAllTimers());
    expect(resizeObserverMock).toHaveBeenCalled();

    await act(async () =>
      rerender(
        <AutoHeight data-testid="autoHeight">
          <div
            data-testid="child"
            data-height="300"
          >
            Resizable Content Updated
          </div>
        </AutoHeight>,
      ),
    );
    await act(async () => fireEvent(wrapper, new Event("transitionend")));
    await act(async () => jest.runAllTimers());
    expect(wrapper).toHaveStyle("height: 300px");
  });
});
