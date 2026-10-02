import type { DockEdge } from "../components/interface";

export const SNAP_THRESHOLD = 24;
export const SNAP_HYSTERESIS = 40; // px threshold to UN-snap once snapped (larger than SNAP_THRESHOLD)

/**
 * Detect if the cursor is near an edge for snapping to dock.
 * Uses hysteresis when already snapped to prevent flickering.
 */
export function detectSnapEdge(
  mouseX: number,
  mouseY: number,
  currentSnap: DockEdge | null,
): DockEdge | null {
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

  if (currentSnap) {
    return null;
  }

  if (mouseX < SNAP_THRESHOLD) {
    return "left";
  }
  if (mouseX > window.innerWidth - SNAP_THRESHOLD) {
    return "right";
  }
  if (mouseY < SNAP_THRESHOLD) {
    return "top";
  }
  if (mouseY > window.innerHeight - SNAP_THRESHOLD) {
    return "bottom";
  }

  return null;
}
