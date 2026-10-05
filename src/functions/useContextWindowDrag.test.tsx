import { fireEvent, render, screen } from "@testing-library/react";
import { type Dispatch, useRef } from "react";
import type { DockEdge } from "../components/interface";
import type { DockingAction } from "../reducer";
import { useContextWindowDrag } from "./useContextWindowDrag";

interface TestHarnessProps {
  dispatch: Dispatch<DockingAction>;
  handleDock: (edge: DockEdge) => void;
  handleUndock: (pointer?: { x: number; y: number }) => void;
  isDocked?: boolean;
  dockedEdge?: DockEdge;
}

const TestHarness = ({
  dispatch,
  handleDock,
  handleUndock,
  isDocked = false,
  dockedEdge,
}: TestHarnessProps): React.ReactElement => {
  const windowRef = useRef<HTMLDivElement>(null);
  const windowPosRef = useRef({ x: 0, y: 0 });
  const isDockedRef = useRef(isDocked);
  const drag = useContextWindowDrag({
    id: "test-window",
    dockable: true,
    allowUndock: true,
    isDocked,
    dockedEdge,
    windowVisible: true,
    moving: false,
    windowRef,
    windowPosRef,
    isDockedRef,
    dispatch,
    move: jest.fn(),
    setMoving: jest.fn(),
    setWindowVisible: jest.fn(),
    checkPosition: jest.fn(),
    handleDock,
    handleUndock,
  });

  return (
    <div ref={windowRef}>
      <div onMouseDown={drag.onTitleMouseDown}>Window title</div>
    </div>
  );
};

describe("useContextWindowDrag", () => {
  test("calls the dock API and dispatches drag actions when released near an edge", () => {
    const actions: DockingAction[] = [];
    const dispatch: Dispatch<DockingAction> = (action) => actions.push(action);
    const handleDock = jest.fn();

    render(
      <TestHarness
        dispatch={dispatch}
        handleDock={handleDock}
        handleUndock={jest.fn()}
      />,
    );

    fireEvent.mouseDown(screen.getByText("Window title"));
    fireEvent.mouseMove(document, { clientX: 2, clientY: 200, movementX: 2, movementY: 0 });
    fireEvent.mouseUp(document);

    expect(handleDock).toHaveBeenCalledWith("left");
    expect(actions).toEqual(
      expect.arrayContaining([
        { type: "startDockDrag", id: "test-window" },
        { type: "setDockDragEdge", edge: "left" },
        { type: "endDockDrag", id: "test-window" },
      ]),
    );
  });

  test("calls the undock API with the pointer when dragging away from a dock edge", () => {
    const dispatch: Dispatch<DockingAction> = jest.fn();
    const handleUndock = jest.fn();

    render(
      <TestHarness
        dispatch={dispatch}
        handleDock={jest.fn()}
        handleUndock={handleUndock}
        isDocked
        dockedEdge="left"
      />,
    );

    fireEvent.mouseDown(screen.getByText("Window title"));
    fireEvent.mouseMove(document, { clientX: 100, clientY: 200, movementX: 100, movementY: 0 });

    expect(handleUndock).toHaveBeenCalledWith({ x: 100, y: 200 });
  });
});
