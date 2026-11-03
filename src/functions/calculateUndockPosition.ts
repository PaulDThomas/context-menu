import type { WindowRect } from "../reducer/types";

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

  const anchor = anchorElement?.getBoundingClientRect();
  return {
    left: (anchor?.left ?? 16) + window.scrollX,
    top: (anchor?.bottom ?? 16) + window.scrollY,
  };
}
