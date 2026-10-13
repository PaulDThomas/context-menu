import { act, fireEvent, render, screen } from "@testing-library/react";
import { ClickForMenu } from "./ClickForMenu";

describe("ClickForMenu", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("Render and open menu", async () => {
    const mockClick = vi.fn();
    await act(async () =>
      render(
        <ClickForMenu
          id="test-c4m"
          menuItems={[
            {
              label: "Test Action",
              action: mockClick,
            },
          ]}
        >
          <div>Test Child</div>
        </ClickForMenu>,
      ),
    );

    const c4mButton = screen.queryByText("Test Child");
    expect(c4mButton).toBeInTheDocument();
    await act(async () => fireEvent.click(c4mButton!));
    await act(async () => {
      vi.runAllTimers();
    });
    const menuItem = screen.queryByText("Test Action");
    expect(menuItem).toBeInTheDocument();
    expect(menuItem).toBeVisible();
    expect(menuItem).toHaveTextContent("Test Action");

    // Clicking the menu item should close the menu
    await act(async () => fireEvent.mouseDown(menuItem!));
    expect(mockClick).toHaveBeenCalled();
    await act(async () => {
      vi.runAllTimers();
    });
    expect(menuItem).not.toBeInTheDocument();
  });

  test("Normal click if there are no menu items", async () => {
    const mockClick = vi.fn();
    const mockClick2 = vi.fn();
    await act(async () =>
      render(
        <ClickForMenu
          id="test-c4m"
          onClick={mockClick2}
        >
          <div onClick={mockClick}>Test Child</div>
        </ClickForMenu>,
      ),
    );
    const c4mButton = screen.queryByText("Test Child");
    expect(c4mButton).toBeInTheDocument();
    await act(async () => fireEvent.click(c4mButton!));
    await act(async () => {
      vi.runAllTimers();
    });
    expect(mockClick).toHaveBeenCalled();
    expect(mockClick2).toHaveBeenCalled();
  });

  test("Click outside to close menu", async () => {
    await act(async () =>
      render(
        <ClickForMenu
          id="test-c4m"
          menuItems={[
            {
              label: "Test Action",
              action: vi.fn(),
            },
          ]}
        >
          <div>Test Child</div>
        </ClickForMenu>,
      ),
    );

    const c4mButton = screen.queryByText("Test Child");
    expect(c4mButton).toBeInTheDocument();
    await act(async () => fireEvent.click(c4mButton!));
    await act(async () => {
      vi.runAllTimers();
    });

    const menuItem = screen.queryByText("Test Action");
    expect(menuItem).toBeInTheDocument();
    expect(menuItem).toBeVisible();

    // Click outside the menu
    await act(async () => fireEvent.mouseDown(document.body));
    await act(async () => {
      vi.runAllTimers();
    });

    expect(menuItem).not.toBeInTheDocument();
  });

  test("Click outside with non-Element target closes menu", async () => {
    await act(async () =>
      render(
        <ClickForMenu
          id="test-c4m"
          menuItems={[
            {
              label: "Test Action",
              action: vi.fn(),
            },
          ]}
        >
          <div>Test Child</div>
        </ClickForMenu>,
      ),
    );

    const c4mButton = screen.queryByText("Test Child");
    expect(c4mButton).toBeInTheDocument();
    await act(async () => fireEvent.click(c4mButton!));
    await act(async () => {
      vi.runAllTimers();
    });

    const menuItem = screen.queryByText("Test Action");
    expect(menuItem).toBeInTheDocument();
    expect(menuItem).toBeVisible();

    // Simulate a click with a non-Element target (e.g., document or text node)
    const mouseEvent = new MouseEvent("mousedown", {
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(mouseEvent, "target", {
      value: document,
      enumerable: true,
    });
    await act(async () => {
      document.dispatchEvent(mouseEvent);
      vi.runAllTimers();
    });

    expect(menuItem).not.toBeInTheDocument();
  });

  test("Unmount cleanup clears pending hide timeout and aborts controller", async () => {
    const abortSpy = vi.spyOn(AbortController.prototype, "abort");

    let unmount: () => void = () => {};
    await act(async () => {
      const res = render(
        <ClickForMenu
          id="cleanup-c4m"
          menuItems={[{ label: "Item", action: () => {} }]}
        >
          <div>Click Me</div>
        </ClickForMenu>,
      );
      unmount = res.unmount;
    });

    // Unmount immediately to trigger cleanup while the 300ms timeout is pending
    await act(async () => {
      unmount();
    });

    expect(abortSpy).toHaveBeenCalled();
    abortSpy.mockRestore();
  });

  test("Rapid re-open aborts pending hide and keeps menu visible", async () => {
    await act(async () =>
      render(
        <ClickForMenu
          id="rapid"
          menuItems={[{ label: "Action", action: () => {} }]}
        >
          <div>Trigger</div>
        </ClickForMenu>,
      ),
    );

    // Open menu
    const trigger = screen.getByText("Trigger");
    await act(async () => fireEvent.click(trigger));
    await act(async () => {
      // run the 1ms open timer and flush any pending
      vi.runAllTimers();
    });
    const item = screen.getByText("Action");
    expect(item).toBeInTheDocument();

    // Close via menu selection (schedules 300ms hide)
    await act(async () => fireEvent.mouseDown(item));

    // Re-open quickly before 300ms elapses
    await act(async () => fireEvent.click(trigger));
    await act(async () => {
      // run the 1ms opener (aborts previous hide) and the 300ms hide safely
      vi.runAllTimers();
    });

    expect(screen.getByText("Action")).toBeInTheDocument();
  });
});
