import { type MouseEvent as ReactMouseEvent, useCallback, useEffect, useRef } from "react";

interface UseMouseMoveProps {
  onMouseDown?: (e: ReactMouseEvent<HTMLElement | SVGElement>) => void;
  onMouseMove?: (e: MouseEvent) => void;
  onMouseUp?: (e: MouseEvent) => void;
  onInteractionEnd?: (e: MouseEvent | PointerEvent) => void;
  interactionEndEnabled?: boolean;
  onViewportResize?: (e: UIEvent) => void;
  viewportResizeEnabled?: boolean;
}

interface UseMouseMoveResult {
  onMouseDown: (e: ReactMouseEvent<HTMLElement | SVGElement>) => void;
  onMouseMove: (e: MouseEvent) => void;
  onMouseUp: (e: MouseEvent) => void;
  armInteractionEnd: () => void;
}

export const useMouseMove = ({
  onMouseDown: onMouseDownCallback,
  onMouseMove: onMouseMoveCallback,
  onMouseUp: onMouseUpCallback,
  onInteractionEnd: onInteractionEndCallback,
  interactionEndEnabled = true,
  onViewportResize: onViewportResizeCallback,
  viewportResizeEnabled = true,
}: UseMouseMoveProps): UseMouseMoveResult => {
  const mouseMoveRef = useRef<((e: MouseEvent) => void) | null>(null);
  const mouseUpRef = useRef<((e: MouseEvent) => void) | null>(null);
  const interactionEndRef = useRef<((e: MouseEvent | PointerEvent) => void) | null>(null);
  const interactionEndCallbackRef = useRef(onInteractionEndCallback);
  const viewportResizeCallbackRef = useRef(onViewportResizeCallback);

  useEffect(() => {
    interactionEndCallbackRef.current = onInteractionEndCallback;
  }, [onInteractionEndCallback]);

  useEffect(() => {
    viewportResizeCallbackRef.current = onViewportResizeCallback;
  }, [onViewportResizeCallback]);

  const removeMouseListeners = useCallback(() => {
    if (mouseMoveRef.current) {
      document.removeEventListener("mousemove", mouseMoveRef.current);
    }
    if (mouseUpRef.current) {
      document.removeEventListener("mouseup", mouseUpRef.current);
    }
  }, []);

  const removeInteractionEndListeners = useCallback(() => {
    if (interactionEndRef.current) {
      document.removeEventListener("mouseup", interactionEndRef.current as EventListener, true);
      document.removeEventListener("pointerup", interactionEndRef.current as EventListener, true);
      interactionEndRef.current = null;
    }
  }, []);

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onMouseMoveCallback?.(e);
    },
    [onMouseMoveCallback],
  );

  const onMouseUp = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      removeMouseListeners();
      const target = e.target;
      if (target instanceof HTMLElement || target instanceof SVGElement) {
        target.style.userSelect = "auto";
      }
      onMouseUpCallback?.(e);
    },
    [onMouseUpCallback, removeMouseListeners],
  );

  const onMouseDown = useCallback(
    (e: ReactMouseEvent<HTMLElement | SVGElement>) => {
      const target = e.target;
      if (target instanceof HTMLElement || target instanceof SVGElement) {
        target.style.userSelect = "none";
      }
      mouseMoveRef.current = onMouseMove;
      mouseUpRef.current = onMouseUp;
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
      onMouseDownCallback?.(e);
    },
    [onMouseDownCallback, onMouseMove, onMouseUp],
  );

  const armInteractionEnd = useCallback(() => {
    if (!interactionEndEnabled || interactionEndRef.current) {
      return;
    }

    const onInteractionEnd = (e: MouseEvent | PointerEvent) => {
      removeInteractionEndListeners();
      interactionEndCallbackRef.current?.(e);
    };

    interactionEndRef.current = onInteractionEnd;
    document.addEventListener("mouseup", onInteractionEnd as EventListener, true);
    document.addEventListener("pointerup", onInteractionEnd as EventListener, true);
  }, [interactionEndEnabled, removeInteractionEndListeners]);

  useEffect(() => {
    if (!interactionEndEnabled) {
      removeInteractionEndListeners();
    }
  }, [interactionEndEnabled, removeInteractionEndListeners]);

  useEffect(() => {
    if (!viewportResizeEnabled || !viewportResizeCallbackRef.current) {
      return;
    }

    const onViewportResize = (e: UIEvent) => {
      viewportResizeCallbackRef.current?.(e);
    };

    window.addEventListener("resize", onViewportResize);

    return () => {
      window.removeEventListener("resize", onViewportResize);
    };
  }, [viewportResizeEnabled]);

  useEffect(() => {
    return () => {
      removeMouseListeners();
      removeInteractionEndListeners();
    };
  }, [removeInteractionEndListeners, removeMouseListeners]);

  return {
    onMouseDown,
    onMouseMove,
    onMouseUp,
    armInteractionEnd,
  };
};
