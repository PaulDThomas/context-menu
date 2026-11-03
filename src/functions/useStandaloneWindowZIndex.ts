import { useCallback, useLayoutEffect, useState } from "react";
import { WINDOW_Z_INDEX_RESET_EVENT } from "./contextWindowConstants";
import { getBodyZIndexLimits } from "./getBodyZIndexLimits";
import { raiseBodyWindow } from "./raiseBodyWindow";

export const useStandaloneWindowZIndex = (
  enabled: boolean,
  windowRef: React.RefObject<HTMLDivElement | null>,
): { zIndex: number; pushToTop: () => void } => {
  const [zIndex, setZIndex] = useState(() => getBodyZIndexLimits().min);
  useLayoutEffect(() => {
    if (!enabled) return;
    const handleReset = (): void => {
      const index = Number.parseInt(windowRef.current?.style.zIndex ?? "", 10);
      setZIndex(Number.isFinite(index) ? index : getBodyZIndexLimits().min);
    };
    document.addEventListener(WINDOW_Z_INDEX_RESET_EVENT, handleReset);
    return () => document.removeEventListener(WINDOW_Z_INDEX_RESET_EVENT, handleReset);
  }, [enabled, windowRef]);

  const pushToTop = useCallback(() => {
    if (enabled && windowRef.current) {
      setZIndex(raiseBodyWindow(windowRef.current));
    }
  }, [enabled, windowRef]);

  return { zIndex, pushToTop };
};
