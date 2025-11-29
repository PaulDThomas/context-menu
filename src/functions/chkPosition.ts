import { RefObject } from "react";

/**
 * Check that an existing div is inside the viewport
 * @param divRef Check div is inside view port, and return n
 * @returns \{ translateX, translateY \} Amount to move on X and Y axis
 */
export const chkPosition = (
  divRef: RefObject<HTMLDivElement | null>,
): { translateX: number; translateY: number } => {
  if (!divRef.current) {
    return { translateX: 0, translateY: 0 };
  } else {
    const innerBounce = 16;
    const posn = divRef.current.getBoundingClientRect();
    let translateX = 0;
    if (posn.left < innerBounce) {
      translateX = -posn.left + innerBounce;
    } else if (posn.right > window.innerWidth) {
      translateX = Math.max(-posn.left + innerBounce, window.innerWidth - posn.right - innerBounce);
    }
    let translateY = 0;
    if (posn.top < innerBounce) {
      translateY = -posn.top + innerBounce;
    } else if (posn.bottom > window.innerHeight) {
      translateY = Math.max(
        -posn.top + innerBounce,
        window.innerHeight - posn.bottom - innerBounce,
      );
    }
    return { translateX, translateY };
  }
};
