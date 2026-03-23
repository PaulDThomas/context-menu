import { fireEvent, render, screen } from "@testing-library/react";
import { useEffect, useRef } from "react";
import { useMouseMove } from "./useMouseMove";

interface TestHarnessProps {
  onMouseDown?: (e: React.MouseEvent<HTMLElement | SVGElement>) => void;
  onMouseMove?: (e: MouseEvent) => void;
  onMouseUp?: (e: MouseEvent) => void;
  onInteractionEnd?: (e: MouseEvent | PointerEvent) => void;
  onViewportResize?: (e: UIEvent) => void;
  triggerInteractionEnd?: boolean;
  interactionEndEnabled?: boolean;
  viewportResizeEnabled?: boolean;
}

const TestHarness = ({
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onInteractionEnd,
  onViewportResize,
  triggerInteractionEnd = false,
  interactionEndEnabled = true,
  viewportResizeEnabled = true,
}: TestHarnessProps): React.ReactElement => {
  const windowRef = useRef<HTMLDivElement | null>(null);
  const { armInteractionEnd, ...api } = useMouseMove({
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onInteractionEnd,
    interactionEndEnabled,
    onViewportResize,
    viewportResizeEnabled,
  });

  useEffect(() => {
    if (triggerInteractionEnd) {
      armInteractionEnd();
    }
  }, [armInteractionEnd, triggerInteractionEnd]);

  return (
    <>
      <div
        ref={windowRef}
        data-testid="window"
      />
      <div
        data-testid="title"
        onMouseDown={api.onMouseDown}
      >
        Title
      </div>
      <svg
        data-testid="svg-target"
        onMouseDown={api.onMouseDown}
      />
    </>
  );
};

describe("useMouseMove", () => {
  test("invokes onMouseDown and toggles userSelect", () => {
    const onMouseDown = jest.fn();

    render(<TestHarness onMouseDown={onMouseDown} />);

    const title = screen.getByTestId("title");
    fireEvent.mouseDown(title);

    expect(onMouseDown).toHaveBeenCalledTimes(1);
    expect((title as HTMLElement).style.userSelect).toBe("none");
  });

  test("invokes onMouseMove callback when document mousemove fires", () => {
    const onMouseMove = jest.fn();

    render(<TestHarness onMouseMove={onMouseMove} />);

    const title = screen.getByTestId("title");
    fireEvent.mouseDown(title);

    const moveEvent = new MouseEvent("mousemove");
    Object.defineProperty(moveEvent, "movementX", { value: 4 });
    Object.defineProperty(moveEvent, "movementY", { value: -2 });
    document.dispatchEvent(moveEvent);

    expect(onMouseMove).toHaveBeenCalledTimes(1);
    expect(onMouseMove).toHaveBeenCalledWith(moveEvent);
  });

  test("invokes onMouseUp and restores userSelect on document mouseup", () => {
    const onMouseUp = jest.fn();

    render(<TestHarness onMouseUp={onMouseUp} />);

    const title = screen.getByTestId("title");
    fireEvent.mouseDown(title);
    expect((title as HTMLElement).style.userSelect).toBe("none");

    fireEvent.mouseUp(title);
    expect((title as HTMLElement).style.userSelect).toBe("auto");
    expect(onMouseUp).toHaveBeenCalledTimes(1);
  });

  test("handles svg and non-element targets for userSelect", () => {
    render(<TestHarness />);

    const svgTarget = screen.getByTestId("svg-target") as unknown as SVGElement;
    fireEvent.mouseDown(svgTarget);
    expect(svgTarget.style.userSelect).toBe("none");

    fireEvent.mouseUp(svgTarget);
    expect(svgTarget.style.userSelect).toBe("auto");
  });

  test("cleans listeners on unmount", () => {
    const removeDocumentSpy = jest.spyOn(document, "removeEventListener");
    const removeWindowSpy = jest.spyOn(window, "removeEventListener");

    const { unmount } = render(<TestHarness onViewportResize={jest.fn()} />);
    fireEvent.mouseDown(screen.getByTestId("title"));

    unmount();

    const documentMoves = removeDocumentSpy.mock.calls.filter((call) => call[0] === "mousemove");
    const documentUps = removeDocumentSpy.mock.calls.filter((call) => call[0] === "mouseup");

    expect(documentMoves.length).toBeGreaterThanOrEqual(1);
    expect(documentUps.length).toBeGreaterThanOrEqual(1);
    expect(removeWindowSpy).toHaveBeenCalledWith("resize", expect.any(Function));

    removeDocumentSpy.mockRestore();
    removeWindowSpy.mockRestore();
  });

  test("arms interaction-end listeners once and removes them after mouseup", () => {
    const onInteractionEnd = jest.fn();
    const addDocumentSpy = jest.spyOn(document, "addEventListener");
    const removeDocumentSpy = jest.spyOn(document, "removeEventListener");

    const { rerender } = render(
      <TestHarness
        onInteractionEnd={onInteractionEnd}
        triggerInteractionEnd={true}
      />,
    );

    rerender(
      <TestHarness
        onInteractionEnd={onInteractionEnd}
        triggerInteractionEnd={true}
      />,
    );

    const interactionAdds = addDocumentSpy.mock.calls.filter(
      (call) => (call[0] === "mouseup" || call[0] === "pointerup") && call[2] === true,
    );
    expect(interactionAdds).toHaveLength(2);

    const mouseUpEvent = new MouseEvent("mouseup", { bubbles: true });
    document.dispatchEvent(mouseUpEvent);

    expect(onInteractionEnd).toHaveBeenCalledTimes(1);
    expect(onInteractionEnd).toHaveBeenCalledWith(mouseUpEvent);

    const interactionRemoves = removeDocumentSpy.mock.calls.filter(
      (call) => (call[0] === "mouseup" || call[0] === "pointerup") && call[2] === true,
    );
    expect(interactionRemoves).toHaveLength(2);

    addDocumentSpy.mockRestore();
    removeDocumentSpy.mockRestore();
  });

  test("cleans pending interaction-end listeners on unmount", () => {
    const removeDocumentSpy = jest.spyOn(document, "removeEventListener");

    const { unmount } = render(<TestHarness triggerInteractionEnd={true} />);

    unmount();

    const interactionRemoves = removeDocumentSpy.mock.calls.filter(
      (call) => (call[0] === "mouseup" || call[0] === "pointerup") && call[2] === true,
    );
    expect(interactionRemoves).toHaveLength(2);

    removeDocumentSpy.mockRestore();
  });

  test("clears pending interaction-end listeners when disabled", () => {
    const removeDocumentSpy = jest.spyOn(document, "removeEventListener");

    const { rerender } = render(
      <TestHarness
        triggerInteractionEnd={true}
        interactionEndEnabled={true}
      />,
    );

    rerender(
      <TestHarness
        triggerInteractionEnd={false}
        interactionEndEnabled={false}
      />,
    );

    const interactionRemoves = removeDocumentSpy.mock.calls.filter(
      (call) => (call[0] === "mouseup" || call[0] === "pointerup") && call[2] === true,
    );
    expect(interactionRemoves).toHaveLength(2);

    removeDocumentSpy.mockRestore();
  });

  test("invokes viewport resize callback when window resize fires", () => {
    const onViewportResize = jest.fn();

    render(<TestHarness onViewportResize={onViewportResize} />);

    const resizeEvent = new UIEvent("resize");
    window.dispatchEvent(resizeEvent);

    expect(onViewportResize).toHaveBeenCalledTimes(1);
    expect(onViewportResize).toHaveBeenCalledWith(resizeEvent);
  });

  test("does not attach viewport resize listener when disabled", () => {
    const addWindowSpy = jest.spyOn(window, "addEventListener");

    render(
      <TestHarness
        onViewportResize={jest.fn()}
        viewportResizeEnabled={false}
      />,
    );

    expect(addWindowSpy).not.toHaveBeenCalledWith("resize", expect.any(Function));

    addWindowSpy.mockRestore();
  });
});
