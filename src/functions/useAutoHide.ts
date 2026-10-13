import { RefObject, useEffect, useState } from "react";
import { distanceToRect } from "./distanceToRect";
import { DOCK_PANEL_AUTOHIDE_DISTANCE } from "./dockPanelConstants";

/**
 * While `enabled`, reports whether the pointer has moved more than
 * DOCK_PANEL_AUTOHIDE_DISTANCE away from the element (or left the window)
 */
export const useAutoHide = (
  enabled: boolean,
  elementRef: RefObject<HTMLElement | null>,
): [boolean, (hidden: boolean) => void] => {
  const [isAutoHidden, setIsAutoHidden] = useState<boolean>(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const handlePointerMove = (e: MouseEvent) => {
      const element = elementRef.current;
      /* istanbul ignore next */
      if (!element) {
        return;
      }
      // Measured as rendered: the full bar while shown, just the edge line while hidden
      const rect = element.getBoundingClientRect();
      setIsAutoHidden(distanceToRect(rect, e.clientX, e.clientY) > DOCK_PANEL_AUTOHIDE_DISTANCE);
    };
    // Leaving the window counts as moving away
    const handlePointerLeave = (e: MouseEvent) => {
      if (e.relatedTarget === null) {
        setIsAutoHidden(true);
      }
    };
    document.addEventListener("mousemove", handlePointerMove);
    document.addEventListener("mouseout", handlePointerLeave);
    return () => {
      document.removeEventListener("mousemove", handlePointerMove);
      document.removeEventListener("mouseout", handlePointerLeave);
    };
  }, [elementRef, enabled]);

  return [enabled && isAutoHidden, setIsAutoHidden];
};
