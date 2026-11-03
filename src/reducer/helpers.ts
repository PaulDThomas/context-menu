import type { DockEdge } from "../components/interface";

/**
 * Moves a window to the end of the zOrder (raises it).
 * Returns the original array if the window is already at the end or not found.
 */
export const raise = (zOrder: string[], id: string): string[] => {
  const index = zOrder.indexOf(id);
  if (index === -1 || index === zOrder.length - 1) {
    return zOrder;
  }
  return [...zOrder.filter((windowId) => windowId !== id), id];
};

/**
 * Removes an edge from a Set.
 * Returns the original Set if the edge is not present.
 */
export const withoutEdge = (edges: Set<DockEdge>, edge: DockEdge): Set<DockEdge> => {
  if (!edges.has(edge)) {
    return edges;
  }
  const next = new Set(edges);
  next.delete(edge);
  return next;
};
