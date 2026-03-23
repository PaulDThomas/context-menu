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
        onPointerDown={(e) =>
          api.onMouseDown(e as unknown as React.MouseEvent<HTMLElement | SVGElement>)
        }
      >
        Title
      </div>
      <svg
        data-testid="svg-target"
        onMouseDown={api.onMouseDown}
        onPointerDown={(e) =>
          api.onMouseDown(e as unknown as React.MouseEvent<HTMLElement | SVGElement>)
        }
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

  test("invokes onMouseMove callback when document pointermove fires", () => {
    const onMouseMove = jest.fn();

    render(<TestHarness onMouseMove={onMouseMove} />);

    const title = screen.getByTestId("title");
    fireEvent.pointerDown(title);

    const moveEvent = new Event("pointermove") as unknown as MouseEvent;
    Object.defineProperty(moveEvent, "movementX", { value: 4 });
    Object.defineProperty(moveEvent, "movementY", { value: -2 });
    document.dispatchEvent(moveEvent);

    expect(onMouseMove).toHaveBeenCalledTimes(1);
    expect(onMouseMove).toHaveBeenCalledWith(moveEvent);
  });

  test("invokes onMouseUp and restores userSelect on document pointerup", () => {
    const onMouseUp = jest.fn();

    render(<TestHarness onMouseUp={onMouseUp} />);

    const title = screen.getByTestId("title");
    fireEvent.pointerDown(title);
    expect((title as HTMLElement).style.userSelect).toBe("none");

    fireEvent.pointerUp(title);
    expect((title as HTMLElement).style.userSelect).toBe("");
    expect(onMouseUp).toHaveBeenCalledTimes(1);
  });

  test("restores userSelect on the original mousedown element when pointerup occurs elsewhere", () => {
    render(<TestHarness />);

    const title = screen.getByTestId("title") as HTMLElement;
    const otherTarget = screen.getByTestId("window") as HTMLElement;

    title.style.userSelect = "text";

    fireEvent.pointerDown(title);
    expect(title.style.userSelect).toBe("none");

    fireEvent.pointerUp(otherTarget);

    expect(title.style.userSelect).toBe("text");
    expect(otherTarget.style.userSelect).toBe("");
  });

  test("handles svg and non-element targets for userSelect", () => {
    render(<TestHarness />);

    const svgTarget = screen.getByTestId("svg-target") as unknown as SVGElement;
    fireEvent.pointerDown(svgTarget);
    expect(svgTarget.style.userSelect).toBe("none");

    fireEvent.pointerUp(svgTarget);
    expect(svgTarget.style.userSelect).toBe("");
  });

  test("cleans listeners on unmount", () => {
    const removeDocumentSpy = jest.spyOn(document, "removeEventListener");
    const removeWindowSpy = jest.spyOn(window, "removeEventListener");

    const { unmount } = render(<TestHarness onViewportResize={jest.fn()} />);
    fireEvent.mouseDown(screen.getByTestId("title"));

    unmount();

    const documentMoves = removeDocumentSpy.mock.calls.filter((call) => call[0] === "mousemove");
    const documentUps = removeDocumentSpy.mock.calls.filter((call) => call[0] === "mouseup");
    const documentPointerMoves = removeDocumentSpy.mock.calls.filter(
      (call) => call[0] === "pointermove",
    );
    const documentPointerUps = removeDocumentSpy.mock.calls.filter(
      (call) => call[0] === "pointerup",
    );

    expect(documentMoves.length).toBeGreaterThanOrEqual(1);
    expect(documentUps.length).toBeGreaterThanOrEqual(1);
    expect(documentPointerMoves.length).toBeGreaterThanOrEqual(1);
    expect(documentPointerUps.length).toBeGreaterThanOrEqual(1);
    expect(removeWindowSpy).toHaveBeenCalledWith("resize", expect.any(Function));

    removeDocumentSpy.mockRestore();
    removeWindowSpy.mockRestore();
  });

  test("restores userSelect on unmount when mouseup never fires", () => {
    const { unmount } = render(<TestHarness />);
    const title = screen.getByTestId("title") as HTMLElement;

    title.style.userSelect = "text";

    fireEvent.mouseDown(title);
    expect(title.style.userSelect).toBe("none");

    unmount();

    expect(title.style.userSelect).toBe("text");
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
