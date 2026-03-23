import { fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { useMouseMove } from "./useMouseMove";

interface TestHarnessProps {
  onMouseDown?: (e: React.MouseEvent<HTMLElement | SVGElement>) => void;
  onMouseMove?: (e: MouseEvent) => void;
  onMouseUp?: (e: MouseEvent) => void;
  onResize?: () => void;
}

const TestHarness = ({
  onMouseDown,
  onMouseMove,
  onMouseUp,
}: TestHarnessProps): React.ReactElement => {
  const windowRef = useRef<HTMLDivElement | null>(null);
  const api = useMouseMove({
    onMouseDown,
    onMouseMove,
    onMouseUp,
  });

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

    const { unmount } = render(<TestHarness />);
    fireEvent.mouseDown(screen.getByTestId("title"));

    unmount();

    const documentMoves = removeDocumentSpy.mock.calls.filter((call) => call[0] === "mousemove");
    const documentUps = removeDocumentSpy.mock.calls.filter((call) => call[0] === "mouseup");

    expect(documentMoves.length).toBeGreaterThanOrEqual(1);
    expect(documentUps.length).toBeGreaterThanOrEqual(1);

    removeDocumentSpy.mockRestore();
    removeWindowSpy.mockRestore();
  });
});
