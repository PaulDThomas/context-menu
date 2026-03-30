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
  const activeInputRef = useRef<"mouse" | "pointer" | null>(null);
  const mouseDownElementRef = useRef<HTMLElement | SVGElement | null>(null);
  const mouseDownUserSelectRef = useRef<string | null>(null);
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
      document.removeEventListener("pointermove", mouseMoveRef.current as EventListener);
    }
    if (mouseUpRef.current) {
      document.removeEventListener("mouseup", mouseUpRef.current);
      document.removeEventListener("pointerup", mouseUpRef.current as EventListener);
    }
    activeInputRef.current = null;
  }, []);

  const restoreMouseDownUserSelect = useCallback(() => {
    if (mouseDownElementRef.current) {
      /* v8 ignore next */
      mouseDownElementRef.current.style.userSelect = mouseDownUserSelectRef.current ?? "";
      mouseDownElementRef.current = null;
      mouseDownUserSelectRef.current = null;
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
      restoreMouseDownUserSelect();
      onMouseUpCallback?.(e);
    },
    [onMouseUpCallback, removeMouseListeners, restoreMouseDownUserSelect],
  );

  const onMouseDown = useCallback(
    (e: ReactMouseEvent<HTMLElement | SVGElement>) => {
      restoreMouseDownUserSelect();
      mouseDownElementRef.current = e.currentTarget;
      mouseDownUserSelectRef.current = e.currentTarget.style.userSelect;
      e.currentTarget.style.userSelect = "none";
      mouseMoveRef.current = onMouseMove;
      mouseUpRef.current = onMouseUp;

      // React can emit both pointer and mouse streams for one interaction.
      // Subscribe to only one stream to avoid applying movement deltas twice.
      if (e.type === "pointerdown") {
        activeInputRef.current = "pointer";
        document.addEventListener("pointermove", onMouseMove as EventListener);
      } else {
        activeInputRef.current = "mouse";
        document.addEventListener("mousemove", onMouseMove);
      }

      // Release events can arrive on either stream depending on the browser
      // and the element the interaction finishes over.
      document.addEventListener("mouseup", onMouseUp);
      document.addEventListener("pointerup", onMouseUp as EventListener);
      onMouseDownCallback?.(e);
    },
    [onMouseDownCallback, onMouseMove, onMouseUp, restoreMouseDownUserSelect],
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
    if (!viewportResizeEnabled || !viewportResizeCallbackRef.current || !onViewportResizeCallback) {
      return;
    }

    const onViewportResize = (e: UIEvent) => {
      viewportResizeCallbackRef.current?.(e);
    };

    window.addEventListener("resize", onViewportResize);

    return () => {
      window.removeEventListener("resize", onViewportResize);
    };
  }, [onViewportResizeCallback, viewportResizeEnabled]);

  useEffect(() => {
    return () => {
      removeMouseListeners();
      removeInteractionEndListeners();
      restoreMouseDownUserSelect();
    };
  }, [removeInteractionEndListeners, removeMouseListeners, restoreMouseDownUserSelect]);

  return {
    onMouseDown,
    onMouseMove,
    onMouseUp,
    armInteractionEnd,
  };
};
