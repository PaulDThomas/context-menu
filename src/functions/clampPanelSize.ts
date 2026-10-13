import type { DockEdge } from "../components/interface";
import { DOCK_PANEL_MIN_SIZE, DOCK_PANEL_VIEWPORT_GAP } from "./dockPanelConstants";
import { isHorizontalEdge } from "./isHorizontalEdge";

/** Limits a panel size to between the minimum and the viewport less the reserved gap */
export const clampPanelSize = (edge: DockEdge, size: number): number => {
  const viewport = isHorizontalEdge(edge) ? window.innerWidth : window.innerHeight;
  const max = Math.max(DOCK_PANEL_MIN_SIZE, viewport - DOCK_PANEL_VIEWPORT_GAP);
  return Math.round(Math.min(max, Math.max(DOCK_PANEL_MIN_SIZE, size)));
};
