import { render, screen } from "@testing-library/react";
import { ContextWindowStack } from "./ContextWindowStack";

describe("ContextWindowStack (deprecated)", () => {
  beforeEach(() => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("Renders children correctly", () => {
    render(
      <ContextWindowStack>
        <div>Test content</div>
      </ContextWindowStack>,
    );
    expect(screen.getByText("Test content")).toBeInTheDocument();
  });

  test("Issues deprecation warning on mount", () => {
    const consoleWarnSpy = jest.spyOn(console, "warn");
    render(
      <ContextWindowStack>
        <div>Test content</div>
      </ContextWindowStack>,
    );
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "ContextWindowStack is deprecated and no longer required. ContextWindow now manages z-index automatically. Please remove the ContextWindowStack wrapper from your code.",
    );
  });

  test("Works with multiple children", () => {
    render(
      <ContextWindowStack>
        <div>Child 1</div>
        <div>Child 2</div>
        <div>Child 3</div>
      </ContextWindowStack>,
    );
    expect(screen.getByText("Child 1")).toBeInTheDocument();
    expect(screen.getByText("Child 2")).toBeInTheDocument();
    expect(screen.getByText("Child 3")).toBeInTheDocument();
  });

  test("Works with no children", () => {
    const { container } = render(<ContextWindowStack />);
    // When no children are provided, the fragment renders nothing
    expect(container.firstChild).toBeNull();
  });

  test("Accepts optional props without error", () => {
    render(
      <ContextWindowStack
        id="test-id"
        minZIndex={2000}
      >
        <div>Test content</div>
      </ContextWindowStack>,
    );
    expect(screen.getByText("Test content")).toBeInTheDocument();
  });
});
