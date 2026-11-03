import type { RefObject } from "react";
import { chkPosition } from "./chkPosition";
import { fitToViewport } from "./fitToViewport";

/**
 * Correct a mounted floating window after a move completes, after undock restoration,
 * or after the viewport resizes. Initial placement should use `chkPosition` to seed
 * the transform before the window is shown.
 *
 * @param divRef Ref to the mounted window element.
 * @param move Applies the calculated translation and updates the caller's position state.
 */
export const checkPosition = (
  divRef: RefObject<HTMLDivElement | null>,
  move: (x: number, y: number) => void,
): void => {
  const position = chkPosition(divRef);
  move(position.translateX, position.translateY);
  fitToViewport(divRef.current);
};
