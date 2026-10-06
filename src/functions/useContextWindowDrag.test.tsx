import { fireEvent, render, screen } from "@testing-library/react";
import { type Dispatch, type RefObject, useRef } from "react";
import type { DockEdge } from "../components/interface";
import type { DockingAction } from "../reducer";
import { useContextWindowDrag } from "./useContextWindowDrag";

interface TestHarnessProps {
  dispatch: Dispatch<DockingAction>;
  handleDock: (edge: DockEdge) => void;
  handleUndock: (pointer?: { x: number; y: number }) => void;
  isDocked?: boolean;
  dockedEdge?: DockEdge;
  dockable?: boolean;
  allowUndock?: boolean;
  windowVisible?: boolean;
  moving?: boolean;
  windowTransform?: string;
  positionRef?: RefObject<{ x: number; y: number }>;
  move?: (x: number, y: number) => void;
  setWindowVisible?: (visible: boolean) => void;
  checkPosition?: () => void;
  attachWindow?: boolean;
}

const TestHarness = ({
  dispatch,
  handleDock,
  handleUndock,
  isDocked = false,
  dockedEdge,
  dockable = true,
  allowUndock = true,
  windowVisible = true,
  moving = false,
  windowTransform,
  positionRef,
  move = jest.fn(),
  setWindowVisible = jest.fn(),
  checkPosition = jest.fn(),
  attachWindow = true,
}: TestHarnessProps): React.ReactElement => {
  const windowRef = useRef<HTMLDivElement>(null);
  const localPositionRef = useRef({ x: 0, y: 0 });
  const windowPosRef = positionRef ?? localPositionRef;
  const isDockedRef = useRef(isDocked);
  const drag = useContextWindowDrag({
    id: "test-window",
    dockable,
    allowUndock,
    isDocked,
    dockedEdge,
    windowVisible,
    moving,
    windowRef,
    windowPosRef,
    isDockedRef,
    dispatch,
    move,
    setMoving: jest.fn(),
    setWindowVisible,
    checkPosition,
    handleDock,
    handleUndock,
  });

  return (
    <>
      {attachWindow && (
        <div
          ref={windowRef}
          data-testid="window"
          style={{ transform: windowTransform }}
        />
      )}
      <div onMouseDown={drag.onTitleMouseDown}>Window title</div>
      <button onClick={drag.armInteractionEnd}>Arm interaction end</button>
    </>
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

  test("docks into a dock panel under the pointer and ignores panels the pointer is outside", () => {
    const handleDock = jest.fn();
    const makePanel = (edge: string, rect: Partial<DOMRect>) => {
      const panel = document.createElement("div");
      panel.dataset.dockPanelEdge = edge;
      panel.getBoundingClientRect = () =>
        ({ left: 0, right: 0, top: 0, bottom: 0, ...rect }) as DOMRect;
      document.body.appendChild(panel);
      return panel;
    };
    const farPanel = makePanel("top", { left: 0, right: 50, top: 0, bottom: 50 });
    const panel = makePanel("right", { left: 400, right: 600, top: 100, bottom: 500 });

    render(
      <TestHarness
        dispatch={jest.fn()}
        handleDock={handleDock}
        handleUndock={jest.fn()}
      />,
    );

    fireEvent.mouseDown(screen.getByText("Window title"));
    fireEvent.mouseMove(document, { clientX: 500, clientY: 300, movementX: 1, movementY: 0 });
    expect(panel).toHaveAttribute("data-dock-target");
    expect(farPanel).not.toHaveAttribute("data-dock-target");
    fireEvent.mouseUp(document);
    expect(panel).not.toHaveAttribute("data-dock-target");
    expect(handleDock).toHaveBeenCalledWith("right");
    farPanel.remove();
    panel.remove();
  });

  test("prefers the overlapping dock panel with the higher z-index", () => {
    const handleDock = jest.fn();
    const rect = { left: 0, right: 100, top: 0, bottom: 100 } as DOMRect;
    const makePanel = (edge: string, zIndex: string) => {
      const panel = document.createElement("div");
      panel.dataset.dockPanelEdge = edge;
      panel.style.zIndex = zIndex;
      panel.getBoundingClientRect = () => rect;
      document.body.appendChild(panel);
      return panel;
    };
    const high = makePanel("left", "5");
    const low = makePanel("bottom", "2");

    render(
      <TestHarness
        dispatch={jest.fn()}
        handleDock={handleDock}
        handleUndock={jest.fn()}
      />,
    );

    fireEvent.mouseDown(screen.getByText("Window title"));
    fireEvent.mouseMove(document, { clientX: 50, clientY: 50, movementX: 1, movementY: 0 });
    expect(high).toHaveAttribute("data-dock-target");
    expect(low).not.toHaveAttribute("data-dock-target");
    fireEvent.mouseUp(document);

    expect(handleDock).toHaveBeenCalledWith("left");
    high.remove();
    low.remove();
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

  test("parses the current translation when a drag starts", () => {
    const positionRef = { current: { x: 0, y: 0 } };

    render(
      <TestHarness
        dispatch={jest.fn()}
        handleDock={jest.fn()}
        handleUndock={jest.fn()}
        positionRef={positionRef}
        windowTransform="translate(-12.5px, 9px)"
      />,
    );

    fireEvent.mouseDown(screen.getByText("Window title"));

    expect(positionRef.current).toEqual({ x: -12.5, y: 9 });
  });

  test("uses a zero translation when the current transform is not a translate", () => {
    const positionRef = { current: { x: 20, y: 30 } };

    render(
      <TestHarness
        dispatch={jest.fn()}
        handleDock={jest.fn()}
        handleUndock={jest.fn()}
        positionRef={positionRef}
        windowTransform="scale(1)"
      />,
    );

    fireEvent.mouseDown(screen.getByText("Window title"));

    expect(positionRef.current).toEqual({ x: 0, y: 0 });
  });

  test("checks position when a floating window is released away from an edge", () => {
    const checkPosition = jest.fn();
    const handleDock = jest.fn();

    render(
      <TestHarness
        dispatch={jest.fn()}
        handleDock={handleDock}
        handleUndock={jest.fn()}
        checkPosition={checkPosition}
      />,
    );

    fireEvent.mouseDown(screen.getByText("Window title"));
    fireEvent.mouseMove(document, { clientX: 400, clientY: 300, movementX: 2, movementY: 1 });
    fireEvent.mouseUp(document);

    expect(handleDock).not.toHaveBeenCalled();
    expect(checkPosition).toHaveBeenCalledTimes(1);
  });

  test.each([
    ["top", 100, 2],
    ["bottom", 2, window.innerHeight - 2],
    ["left", 2, 100],
    ["right", window.innerWidth - 2, 100],
  ] as const)("does not undock a %s window before crossing its edge threshold", (edge, x, y) => {
    const handleUndock = jest.fn();
    const checkPosition = jest.fn();

    render(
      <TestHarness
        dispatch={jest.fn()}
        handleDock={jest.fn()}
        handleUndock={handleUndock}
        checkPosition={checkPosition}
        isDocked
        dockedEdge={edge}
      />,
    );

    fireEvent.mouseDown(screen.getByText("Window title"));
    fireEvent.mouseMove(document, { clientX: x, clientY: y, movementX: 1, movementY: 1 });
    fireEvent.mouseUp(document);

    expect(handleUndock).not.toHaveBeenCalled();
    expect(checkPosition).not.toHaveBeenCalled();
  });

  test.each([
    ["top", 100, 100],
    ["bottom", 100, 100],
    ["left", 100, 100],
    ["right", 100, 100],
  ] as const)("undocks a %s window after it crosses the edge threshold", (edge, x, y) => {
    const handleUndock = jest.fn();

    render(
      <TestHarness
        dispatch={jest.fn()}
        handleDock={jest.fn()}
        handleUndock={handleUndock}
        isDocked
        dockedEdge={edge}
      />,
    );

    fireEvent.mouseDown(screen.getByText("Window title"));
    fireEvent.mouseMove(document, { clientX: x, clientY: y, movementX: 1, movementY: 1 });

    expect(handleUndock).toHaveBeenCalledWith({ x, y });
  });

  test("does not snap or undock when docking is disabled", () => {
    const handleUndock = jest.fn();
    const move = jest.fn();

    render(
      <TestHarness
        dispatch={jest.fn()}
        handleDock={jest.fn()}
        handleUndock={handleUndock}
        isDocked
        dockedEdge="left"
        dockable={false}
        move={move}
      />,
    );

    fireEvent.mouseDown(screen.getByText("Window title"));
    fireEvent.mouseMove(document, { clientX: 100, clientY: 100, movementX: 2, movementY: 3 });

    expect(handleUndock).not.toHaveBeenCalled();
    expect(move).toHaveBeenCalledTimes(1);
  });

  test("restores visibility when a hidden window is dragged into the viewport", () => {
    const setWindowVisible = jest.fn();
    const dispatch = jest.fn();
    const { rerender } = render(
      <TestHarness
        dispatch={dispatch}
        handleDock={jest.fn()}
        handleUndock={jest.fn()}
        setWindowVisible={setWindowVisible}
        windowVisible={false}
      />,
    );
    const windowElement = screen.getByTestId("window");
    jest
      .spyOn(windowElement, "getBoundingClientRect")
      .mockReturnValue(new DOMRect(10, 10, 100, 100));

    fireEvent.mouseDown(screen.getByText("Window title"));
    expect(setWindowVisible).toHaveBeenCalledWith(true);
    fireEvent.mouseMove(document, { clientX: 300, clientY: 300, movementX: 1, movementY: 1 });
    expect(setWindowVisible).toHaveBeenCalledTimes(2);

    rerender(
      <TestHarness
        dispatch={dispatch}
        handleDock={jest.fn()}
        handleUndock={jest.fn()}
        setWindowVisible={setWindowVisible}
        windowVisible={false}
        attachWindow={false}
      />,
    );
    fireEvent.mouseMove(document, { clientX: 300, clientY: 300, movementX: 1, movementY: 1 });
    expect(setWindowVisible).toHaveBeenCalledTimes(2);
  });

  test.each([
    new DOMRect(10, -100, 50, 50),
    new DOMRect(-100, 10, 50, 50),
    new DOMRect(10, window.innerHeight, 50, 50),
    new DOMRect(window.innerWidth, 10, 50, 50),
  ])("does not reveal a hidden window outside the viewport", (rect) => {
    const setWindowVisible = jest.fn();
    render(
      <TestHarness
        dispatch={jest.fn()}
        handleDock={jest.fn()}
        handleUndock={jest.fn()}
        setWindowVisible={setWindowVisible}
        windowVisible={false}
      />,
    );
    jest.spyOn(screen.getByTestId("window"), "getBoundingClientRect").mockReturnValue(rect);

    fireEvent.mouseDown(screen.getByText("Window title"));
    fireEvent.mouseMove(document, { clientX: 300, clientY: 300 });

    expect(setWindowVisible).toHaveBeenCalledTimes(1);
  });

  test("updates window position when the viewport resizes", () => {
    const checkPosition = jest.fn();
    render(
      <TestHarness
        dispatch={jest.fn()}
        handleDock={jest.fn()}
        handleUndock={jest.fn()}
        checkPosition={checkPosition}
      />,
    );

    fireEvent(window, new Event("resize"));

    expect(checkPosition).toHaveBeenCalledTimes(1);
  });

  test("restores body overflow when dragging ends", () => {
    const originalOverflow = document.body.style.overflow;
    const props = {
      dispatch: jest.fn(),
      handleDock: jest.fn(),
      handleUndock: jest.fn(),
    };
    const { rerender } = render(
      <TestHarness
        {...props}
        moving
      />,
    );

    expect(document.body.style.overflow).toBe("hidden");
    rerender(
      <TestHarness
        {...props}
        moving={false}
      />,
    );
    expect(document.body.style.overflow).toBe(originalOverflow);
  });

  test("does not process an interaction end that was armed without a drag", () => {
    const actions: DockingAction[] = [];
    const dispatch: Dispatch<DockingAction> = (action) => actions.push(action);
    const checkPosition = jest.fn();
    render(
      <TestHarness
        dispatch={dispatch}
        handleDock={jest.fn()}
        handleUndock={jest.fn()}
        checkPosition={checkPosition}
      />,
    );

    fireEvent.click(screen.getByText("Arm interaction end"));
    fireEvent.mouseUp(document);

    expect(actions).not.toContainEqual({ type: "endDockDrag", id: "test-window" });
    expect(checkPosition).not.toHaveBeenCalled();
  });
});
