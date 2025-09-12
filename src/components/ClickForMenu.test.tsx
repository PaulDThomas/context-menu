import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClickForMenu } from "./ClickForMenu";

describe("ClickForMenu", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });
  const user = userEvent.setup({ delay: null });

  test("Render and open menu", async () => {
    const mockClick = jest.fn();
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
    await user.click(c4mButton!);
    await act(async () => {
      jest.runAllTimers();
    });
    const menuItem = screen.queryByText("Test Action");
    expect(menuItem).toBeInTheDocument();
    expect(menuItem).toBeVisible();
    expect(menuItem).toHaveTextContent("Test Action");

    // Clicking the menu item should close the menu
    await user.click(menuItem!);
    expect(mockClick).toHaveBeenCalled();
    await act(async () => {
      jest.runAllTimers();
    });
    expect(menuItem).not.toBeInTheDocument();
  });

  test("Normal click if there are no menu items", async () => {
    const mockClick = jest.fn();
    const mockClick2 = jest.fn();
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
    await user.click(c4mButton!);
    await act(async () => {
      jest.runAllTimers();
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
              action: () => console.log("Test Action"),
            },
          ]}
        >
          <div>Test Child</div>
        </ClickForMenu>,
      ),
    );

    const c4mButton = screen.queryByText("Test Child");
    expect(c4mButton).toBeInTheDocument();
    await user.click(c4mButton!);
    await act(async () => {
      jest.runAllTimers();
    });

    const menuItem = screen.queryByText("Test Action");
    expect(menuItem).toBeInTheDocument();
    expect(menuItem).toBeVisible();

    // Click outside the menu
    await user.click(document.body);
    await act(async () => {
      jest.runAllTimers();
    });

    expect(menuItem).not.toBeInTheDocument();
  });
});
