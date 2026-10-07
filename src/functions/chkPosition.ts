import { RefObject } from "react";

/**
 * Calculate the translation needed to keep a div inside the viewport without changing the DOM.
 * Use this to seed the initial transform; use `checkPosition` for post-transition correction.
 *
 * @param divRef Ref to the element to measure.
 * @returns Translation amounts for the X and Y axes.
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
    /* istanbul ignore else */
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
