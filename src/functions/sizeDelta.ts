import type { DockEdge } from "../components/interface";

/** Size change for a pointer movement: moving towards the viewport centre grows the panel */
export const sizeDelta = (edge: DockEdge, dx: number, dy: number): number => {
  switch (edge) {
    case "left":
      return dx;
    case "right":
      return -dx;
    case "top":
      return dy;
    case "bottom":
      return -dy;
  }
};
