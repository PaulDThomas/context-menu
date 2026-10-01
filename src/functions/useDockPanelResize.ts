import { RefObject, useCallback, useEffect, useRef, useState } from "react";
import type { DockEdge } from "../components/interface";
import { clampPanelSize } from "./clampPanelSize";
import { DOCK_PANEL_MIN_SIZE } from "./dockPanelConstants";
import { isHorizontalEdge } from "./isHorizontalEdge";
import { sizeDelta } from "./sizeDelta";

const KEYBOARD_STEP = 10;
const KEYBOARD_LARGE_STEP = 50;

interface UseDockPanelResizeResult {
  /** Size chosen by the user, or null while the panel uses its default size */
  panelSize: number | null;
  isResizing: boolean;
  handleResizeMouseDown: (e: React.MouseEvent<HTMLElement>) => void;
  handleResizeKeyDown: (e: React.KeyboardEvent<HTMLElement>) => void;
}

/** Pointer and keyboard resizing of a dock panel's distance from its screen edge */
export const useDockPanelResize = (
  edge: DockEdge,
  panelRef: RefObject<HTMLElement | null>,
  onResizeStart: () => void,
): UseDockPanelResizeResult => {
  const [panelSize, setPanelSize] = useState<number | null>(null);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const resizeCleanupRef = useRef<(() => void) | null>(null);

  const getCurrentSize = useCallback((): number => {
    /* istanbul ignore next */
    if (!panelRef.current) {
      return DOCK_PANEL_MIN_SIZE;
    }
    const rect = panelRef.current.getBoundingClientRect();
    return isHorizontalEdge(edge) ? rect.width : rect.height;
  }, [edge, panelRef]);

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (e.button !== 0) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      onResizeStart();

      const startX = e.clientX;
      const startY = e.clientY;
      const startSize = getCurrentSize();
      const previousCursor = document.body.style.cursor;
      const previousUserSelect = document.body.style.userSelect;
      document.body.style.cursor = isHorizontalEdge(edge) ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";
      setIsResizing(true);

      const onMouseMove = (moveEvent: MouseEvent) => {
        const delta = sizeDelta(edge, moveEvent.clientX - startX, moveEvent.clientY - startY);
        setPanelSize(clampPanelSize(edge, startSize + delta));
      };

      const cleanup = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", cleanup);
        document.body.style.cursor = previousCursor;
        document.body.style.userSelect = previousUserSelect;
        resizeCleanupRef.current = null;
        setIsResizing(false);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", cleanup);
      resizeCleanupRef.current = cleanup;
    },
    [edge, getCurrentSize, onResizeStart],
  );

  const handleResizeKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      const step = e.shiftKey ? KEYBOARD_LARGE_STEP : KEYBOARD_STEP;
      const keyDeltas: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      };
      const keyDelta = keyDeltas[e.key];
      if (!keyDelta) {
        return;
      }
      const delta = sizeDelta(edge, keyDelta[0], keyDelta[1]);
      if (delta === 0) {
        return;
      }
      e.preventDefault();
      onResizeStart();
      setPanelSize(clampPanelSize(edge, getCurrentSize() + delta));
    },
    [edge, getCurrentSize, onResizeStart],
  );

  // Release document listeners if the panel unmounts mid-resize
  useEffect(() => {
    return () => {
      resizeCleanupRef.current?.();
    };
  }, []);

  return { panelSize, isResizing, handleResizeMouseDown, handleResizeKeyDown };
};
