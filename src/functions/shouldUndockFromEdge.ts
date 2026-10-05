import type { DockEdge } from "../components/interface";

export const UNDOCK_THRESHOLD = 20;

export function shouldUndockFromEdge(edge: DockEdge, mouseX: number, mouseY: number): boolean {
  if (edge === "top" && mouseY > UNDOCK_THRESHOLD) return true;
  if (edge === "bottom" && mouseY < window.innerHeight - UNDOCK_THRESHOLD) return true;
  if (edge === "left" && mouseX > UNDOCK_THRESHOLD) return true;
  if (edge === "right" && mouseX < window.innerWidth - UNDOCK_THRESHOLD) return true;

  return false;
}
