import { useCallback, useRef, useState } from "react";
import type { WindowConfig, WindowRect } from "../components/interface";
import type { DockingAction } from "../reducer";

export const useStandaloneContextWindowState = (id: string) => {
  const [config, setConfig] = useState<{ id: string; value: WindowConfig }>(() => ({
    id,
    value: { title: id || "window" },
  }));
  const savedPosition = useRef<{ id: string; rect: WindowRect } | null>(null);

  const registerWindowConfig = useCallback((windowId: string, update: Partial<WindowConfig>) => {
    setConfig((previous) => {
      const current = previous.id === windowId ? previous.value : { title: windowId || "window" };
      const next = { ...current, ...update, canDock: false, canUndock: false };
      const unchanged =
        previous.id === windowId &&
        (Object.keys(next) as (keyof WindowConfig)[]).every((key) =>
          Object.is(current[key], next[key]),
        );
      return unchanged ? previous : { id: windowId, value: next };
    });
  }, []);

  const dispatch = useCallback((action: DockingAction) => {
    if (action.type === "saveWindowPosition") {
      savedPosition.current = { id: action.id, rect: action.rect };
    }
  }, []);

  const getPreDockRect = useCallback((windowId: string): WindowRect | null => {
    return savedPosition.current?.id === windowId ? savedPosition.current.rect : null;
  }, []);

  return {
    windowConfig: config.id === id ? config.value : { title: id || "window" },
    registerWindowConfig,
    dispatch,
    getPreDockRect,
  };
};
