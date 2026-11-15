import { useCallback, useRef, useState } from "react";
import type { DockEdge, WindowRect } from "../components/interface";

/** Saved dock and floating geometry for a context window. */
interface WindowLocation {
  dockEdge: DockEdge | null;
  rect: WindowRect | null;
}

/** Associates the currently loaded location with its storage key. */
interface StoredWindowLocation {
  key: string | undefined;
  location: WindowLocation | null;
}

const STORAGE_PREFIX = "@asup/context-menu:window-location:";

/**
 * Reads a saved window location from local storage.
 * @param key Stable key identifying the window's saved location.
 * @returns The validated location, or `null` when no usable entry exists.
 */
const readWindowLocation = (key: string | undefined): WindowLocation | null => {
  if (!key) {
    return null;
  }

  try {
    const saved: unknown = JSON.parse(
      window.localStorage.getItem(`${STORAGE_PREFIX}${key}`) ?? "null",
    );
    if (typeof saved !== "object" || saved === null || Array.isArray(saved)) {
      return null;
    }

    const value = saved as Record<string, unknown>;
    const dockEdge =
      value.dockEdge === "top" ||
      value.dockEdge === "right" ||
      value.dockEdge === "bottom" ||
      value.dockEdge === "left"
        ? value.dockEdge
        : null;
    const rawRect = value.rect;
    let rect: WindowRect | null = null;
    if (typeof rawRect === "object" && rawRect !== null && !Array.isArray(rawRect)) {
      const candidate = rawRect as Record<string, unknown>;
      if (
        typeof candidate.x === "number" &&
        Number.isFinite(candidate.x) &&
        typeof candidate.y === "number" &&
        Number.isFinite(candidate.y) &&
        typeof candidate.width === "number" &&
        Number.isFinite(candidate.width) &&
        candidate.width > 0 &&
        typeof candidate.height === "number" &&
        Number.isFinite(candidate.height) &&
        candidate.height > 0
      ) {
        rect = {
          x: candidate.x,
          y: candidate.y,
          width: candidate.width,
          height: candidate.height,
        };
      }
    }

    return dockEdge || rect ? { dockEdge, rect } : null;
  } catch {
    return null;
  }
};

/**
 * Persists opt-in context-window dock and floating geometry preferences.
 * @param key Stable value from the window's `data-acw-key` attribute.
 * @returns The restored location and a callback for saving location updates.
 */
export const useWindowLocationStorage = (key: string | undefined) => {
  const [storedLocation, setStoredLocation] = useState<StoredWindowLocation>(() => ({
    key,
    location: readWindowLocation(key),
  }));
  const storedLocationRef = useRef(storedLocation);
  const location = storedLocation.key === key ? storedLocation.location : readWindowLocation(key);

  const saveWindowLocation = useCallback(
    (update: Partial<WindowLocation>): void => {
      if (!key) {
        return;
      }
      const current =
        storedLocationRef.current.key === key
          ? storedLocationRef.current.location
          : readWindowLocation(key);
      const next: WindowLocation = {
        dockEdge: update.dockEdge === undefined ? (current?.dockEdge ?? null) : update.dockEdge,
        rect: update.rect === undefined ? (current?.rect ?? null) : update.rect,
      };
      const stored: StoredWindowLocation = { key, location: next };
      storedLocationRef.current = stored;
      setStoredLocation(stored);

      try {
        window.localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(next));
      } catch {
        return;
      }
    },
    [key],
  );

  return { location, saveWindowLocation };
};
