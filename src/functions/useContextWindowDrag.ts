import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import type { DockEdge } from "../components/interface";
import type { DockingAction } from "../reducer";
import { detectSnapEdge } from "./detectSnapEdge";
import { useMouseMove } from "./useMouseMove";

const UNDOCK_THRESHOLD = 20;

interface UseContextWindowDragProps {
  id: string;
  dockable: boolean;
  allowUndock: boolean;
  isDocked: boolean;
  dockedEdge?: DockEdge;
  windowVisible: boolean;
  moving: boolean;
  windowRef: React.RefObject<HTMLDivElement | null>;
  windowPosRef: React.MutableRefObject<{ x: number; y: number }>;
  isDockedRef: React.MutableRefObject<boolean>;
  dispatch: React.Dispatch<DockingAction>;
  move: (x: number, y: number) => void;
  setMoving: (nextValue: boolean) => void;
  setWindowVisible: (nextValue: boolean) => void;
  checkPosition: () => void;
  handleDock: (edge: DockEdge) => void;
  handleUndock: (pointer?: { x: number; y: number }) => void;
}

interface UseContextWindowDragResult {
  onTitleMouseDown: (e: React.MouseEvent<HTMLElement>) => void;
  armInteractionEnd: () => void;
  lastMousePosRef: React.MutableRefObject<{ x: number; y: number }>;
}

const parseTranslate = (transform?: string): { x: number; y: number } => {
  const match = transform?.match(/translate\((-?\d+(?:\.\d+)?)px,\s*(-?\d+(?:\.\d+)?)px\)/);
  if (match) {
    return {
      x: Number.parseFloat(match[1]),
      y: Number.parseFloat(match[2]),
    };
  }
  return { x: 0, y: 0 };
};

export const useContextWindowDrag = ({
  id,
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
  setMoving,
  setWindowVisible,
  checkPosition,
  handleDock,
  handleUndock,
}: UseContextWindowDragProps): UseContextWindowDragResult => {
  const targetSnapEdgeRef = useRef<DockEdge | null>(null);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const interactionProcessedRef = useRef<boolean>(false);
  const isInInteractionRef = useRef<boolean>(false);

  const handleDockRef = useRef(handleDock);
  useLayoutEffect(() => {
    handleDockRef.current = handleDock;
  }, [handleDock]);

  const handleUndockRef = useRef(handleUndock);
  useLayoutEffect(() => {
    handleUndockRef.current = handleUndock;
  }, [handleUndock]);

  const { onMouseDown, armInteractionEnd } = useMouseMove({
    onMouseDown: () => {
      interactionProcessedRef.current = false;
      isInInteractionRef.current = true;
      windowPosRef.current = parseTranslate(windowRef.current?.style.transform);
      setMoving(true);
      dispatch({ type: "startDockDrag", id });
      if (!windowVisible) {
        setWindowVisible(true);
      }
      armInteractionEnd();
      dispatch({ type: "raiseWindow", id });
    },
    onMouseMove: (e: MouseEvent) => {
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };

      if (!windowVisible && windowRef.current) {
        const rect = windowRef.current.getBoundingClientRect();
        const isInViewport =
          rect.bottom > 0 &&
          rect.right > 0 &&
          rect.top < window.innerHeight &&
          rect.left < window.innerWidth;
        if (isInViewport) {
          setWindowVisible(true);
        }
      }

      if (!isDockedRef.current && dockable) {
        let topPanel: HTMLElement | null = null;
        let topZ = -Infinity;
        const panels = document.querySelectorAll<HTMLElement>("[data-dock-panel-edge]");
        for (const panel of panels) {
          const r = panel.getBoundingClientRect();
          const isOver =
            e.clientX >= r.left &&
            e.clientX <= r.right &&
            e.clientY >= r.top &&
            e.clientY <= r.bottom;
          // Equal z-index: the later panel in the DOM paints on top
          const z = parseInt(getComputedStyle(panel).zIndex, 10) || 0;
          if (isOver && z >= topZ) {
            topPanel = panel;
            topZ = z;
          }
        }
        for (const panel of panels) {
          panel.toggleAttribute("data-dock-target", panel === topPanel);
        }
        const panelEdge = (topPanel as HTMLElement | null)?.dataset.dockPanelEdge as
          DockEdge | undefined;
        const snapEdge =
          panelEdge ?? detectSnapEdge(e.clientX, e.clientY, targetSnapEdgeRef.current);
        targetSnapEdgeRef.current = snapEdge;
        dispatch({ type: "setDockDragEdge", edge: snapEdge });
      }

      if (isDockedRef.current && dockable && allowUndock) {
        let shouldUndock = false;
        if (dockedEdge === "top" && e.clientY > UNDOCK_THRESHOLD) shouldUndock = true;
        if (dockedEdge === "bottom" && e.clientY < window.innerHeight - UNDOCK_THRESHOLD)
          shouldUndock = true;
        if (dockedEdge === "left" && e.clientX > UNDOCK_THRESHOLD) shouldUndock = true;
        if (dockedEdge === "right" && e.clientX < window.innerWidth - UNDOCK_THRESHOLD)
          shouldUndock = true;

        if (shouldUndock) {
          handleUndockRef.current({ x: e.clientX, y: e.clientY });
          isDockedRef.current = false;
          return;
        }
      }

      move(e.movementX, e.movementY);
    },
    onMouseUp: () => {
      setMoving(false);
      isInInteractionRef.current = false;
      dispatch({ type: "setDockDragEdge", edge: null });
      document
        .querySelectorAll("[data-dock-target]")
        .forEach((panel) => panel.removeAttribute("data-dock-target"));
    },
    onInteractionEnd: () => {
      if (!isInInteractionRef.current || interactionProcessedRef.current) {
        return;
      }
      interactionProcessedRef.current = true;

      const isDockedNow = isDockedRef.current;
      let isDocking = false;
      if (!isDockedNow && dockable && targetSnapEdgeRef.current) {
        handleDockRef.current(targetSnapEdgeRef.current);
        isDocking = true;
      }

      dispatch({ type: "endDockDrag", id });
      targetSnapEdgeRef.current = null;
      isInInteractionRef.current = false;
      if (!isDocking && !isDockedNow) {
        checkPosition();
      }
    },
    interactionEndEnabled: windowVisible,
    onViewportResize: () => {
      checkPosition();
    },
    viewportResizeEnabled: windowVisible,
  });

  const onMouseDownRef = useRef(onMouseDown);
  useLayoutEffect(() => {
    onMouseDownRef.current = onMouseDown;
  }, [onMouseDown]);

  useLayoutEffect(() => {
    if (isDocked) {
      targetSnapEdgeRef.current = null;
    }
  }, [isDocked]);

  useEffect(() => {
    if (!moving) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [moving]);

  const onTitleMouseDown = useCallback((e: React.MouseEvent<HTMLElement>) => {
    onMouseDownRef.current(e);
  }, []);

  return {
    onTitleMouseDown,
    armInteractionEnd,
    lastMousePosRef,
  };
};
