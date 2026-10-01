import type { DockEdge } from "../components/interface";
import type { WindowRect } from "../reducer/types";

// Thresholds for snap detection and undocking
export const SNAP_THRESHOLD = 24;
export const UNDOCK_THRESHOLD = 20;
export const SNAP_HYSTERESIS = 40; // px threshold to UN-snap once snapped (larger than SNAP_THRESHOLD)

/**
 * Detect if the cursor is near an edge for snapping to dock.
 * Uses hysteresis when already snapped to prevent flickering.
 *
 * @param mouseX Current mouse X position in viewport
 * @param mouseY Current mouse Y position in viewport
 * @param currentSnap Currently snapped edge, if any
 * @returns DockEdge to snap to, or null
 */
export function detectSnapEdge(
  mouseX: number,
  mouseY: number,
  currentSnap: DockEdge | null,
): DockEdge | null {
  // Use hysteresis: if already snapped to an edge, use larger threshold to un-snap
  // This prevents snap from flickering as mouse jitters slightly
  const detectionThreshold = currentSnap ? SNAP_HYSTERESIS : SNAP_THRESHOLD;

  if (currentSnap === "left" && mouseX < detectionThreshold) {
    return "left";
  }
  if (currentSnap === "right" && mouseX > window.innerWidth - detectionThreshold) {
    return "right";
  }
  if (currentSnap === "top" && mouseY < detectionThreshold) {
    return "top";
  }
  if (currentSnap === "bottom" && mouseY > window.innerHeight - detectionThreshold) {
    return "bottom";
  }

  // If currently snapped but moved outside hysteresis threshold, clear snap
  if (currentSnap) {
    return null;
  }

  // Not currently snapped, check with standard threshold
  const threshold = SNAP_THRESHOLD;

  if (mouseX < threshold) {
    return "left";
  }
  if (mouseX > window.innerWidth - threshold) {
    return "right";
  }
  if (mouseY < threshold) {
    return "top";
  }
  if (mouseY > window.innerHeight - threshold) {
    return "bottom";
  }

  return null;
}

/**
 * Check if a docked window should be undocked based on cursor position.
 *
 * @param edge The edge the window is docked to
 * @param mouseX Current mouse X position in viewport
 * @param mouseY Current mouse Y position in viewport
 * @returns true if the window should undock
 */
export function shouldUndockFromEdge(edge: DockEdge, mouseX: number, mouseY: number): boolean {
  if (edge === "top" && mouseY > UNDOCK_THRESHOLD) return true;
  if (edge === "bottom" && mouseY < window.innerHeight - UNDOCK_THRESHOLD) return true;
  if (edge === "left" && mouseX > UNDOCK_THRESHOLD) return true;
  if (edge === "right" && mouseX < window.innerWidth - UNDOCK_THRESHOLD) return true;

  return false;
}

/**
 * Calculate the floating position to restore after undocking.
 *
 * @param isDocked Whether the window is currently docked
 * @param pointer Optional pointer position for drag-undock (centres header under pointer)
 * @param savedRect The saved pre-dock position, if any
 * @param anchorElement Optional element to position below (for action-based undock)
 * @returns Position and dimensions to apply to the floating window
 */
export function calculateUndockPosition(
  isDocked: boolean,
  pointer: { x: number; y: number } | undefined,
  savedRect: WindowRect | null,
  anchorElement?: Element | null,
): {
  left: number;
  top: number;
  width?: number;
  height?: number;
  anchorToPointer?: boolean;
} {
  if (pointer) {
    // Drag-undock: centre the header under the pointer (resolved from the latest pointer
    // position when applied) so the drag continues seamlessly
    return {
      left: pointer.x,
      top: pointer.y,
      width: savedRect?.width,
      height: savedRect?.height,
      anchorToPointer: true,
    };
  }

  if (isDocked && savedRect) {
    return {
      left: savedRect.x,
      top: savedRect.y,
      width: savedRect.width,
      height: savedRect.height,
    };
  }

  // No saved floating position (e.g. opened docked) - open below the anchor like a
  // normal open; the on-screen clamp after remount keeps it visible
  const anchor = anchorElement?.getBoundingClientRect();
  return {
    left: (anchor?.left ?? 16) + window.scrollX,
    top: (anchor?.bottom ?? 16) + window.scrollY,
  };
}

/**
 * Apply on-screen clamping to an undocked window position.
 *
 * @param left Window left coordinate (document-relative)
 * @param top Window top coordinate (document-relative)
 * @param width Window width
 * @param height Window height
 * @returns Clamped { left, top } coordinates
 */
export function clampUndockPosition(
  left: number,
  top: number,
  width: number,
  height: number,
): { left: number; top: number } {
  const innerBounce = 16;
  const viewLeft = left - window.scrollX;
  const viewTop = top - window.scrollY;

  let clampedLeft = left;
  let clampedTop = top;

  if (viewLeft + width > window.innerWidth) {
    clampedLeft = Math.max(innerBounce, window.innerWidth - width - innerBounce) + window.scrollX;
  }

  if (viewTop + height > window.innerHeight) {
    clampedTop = Math.max(innerBounce, window.innerHeight - height - innerBounce) + window.scrollY;
  }

  return { left: clampedLeft, top: clampedTop };
}

/**
 * Parse translate transform value from CSS.
 *
 * @param transform CSS transform string
 * @returns Parsed { x, y } or { x: 0, y: 0 }
 */
export function parseTranslate(transform?: string): { x: number; y: number } {
  const match = transform?.match(/translate\((-?\d+(?:\.\d+)?)px,\s*(-?\d+(?:\.\d+)?)px\)/);
  if (match) {
    return {
      x: Number.parseFloat(match[1]),
      y: Number.parseFloat(match[2]),
    };
  }
  return { x: 0, y: 0 };
}
