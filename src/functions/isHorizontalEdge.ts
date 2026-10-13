import type { DockEdge } from "../components/interface";

/** Left and right panels are sized by width, top and bottom panels by height */
export const isHorizontalEdge = (edge: DockEdge): boolean => edge === "left" || edge === "right";
