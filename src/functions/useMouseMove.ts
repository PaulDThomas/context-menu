import { type MouseEvent as ReactMouseEvent, useCallback, useEffect, useRef } from "react";

interface UseMouseMoveProps {
  onMouseDown?: (e: ReactMouseEvent<HTMLElement | SVGElement>) => void;
  onMouseMove?: (e: MouseEvent) => void;
  onMouseUp?: (e: MouseEvent) => void;
}

interface UseMouseMoveResult {
  onMouseDown: (e: ReactMouseEvent<HTMLElement | SVGElement>) => void;
  onMouseMove: (e: MouseEvent) => void;
  onMouseUp: (e: MouseEvent) => void;
}

export const useMouseMove = ({
  onMouseDown: onMouseDownCallback,
  onMouseMove: onMouseMoveCallback,
  onMouseUp: onMouseUpCallback,
}: UseMouseMoveProps): UseMouseMoveResult => {
  const mouseMoveRef = useRef<((e: MouseEvent) => void) | null>(null);
  const mouseUpRef = useRef<((e: MouseEvent) => void) | null>(null);

  const removeMouseListeners = useCallback(() => {
    if (mouseMoveRef.current) {
      document.removeEventListener("mousemove", mouseMoveRef.current);
    }
    if (mouseUpRef.current) {
      document.removeEventListener("mouseup", mouseUpRef.current);
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

  useEffect(() => {
    return () => {
      removeMouseListeners();
    };
  }, [removeMouseListeners]);

  return {
    onMouseDown,
    onMouseMove,
    onMouseUp,
  };
};
