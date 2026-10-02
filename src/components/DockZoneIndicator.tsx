import { classNames } from "../functions";
import styles from "./DockZoneIndicator.module.css";
import type { DockEdge } from "./interface";

interface DockZoneIndicatorProps {
  targetEdge: DockEdge | null;
  isDragging: boolean;
}

const edgeClassNames: Record<DockEdge, string> = {
  top: styles.top,
  bottom: styles.bottom,
  left: styles.left,
  right: styles.right,
};

/** Highlights the screen edge a dragged window will dock to when released */
export const DockZoneIndicator = ({
  targetEdge,
  isDragging,
}: DockZoneIndicatorProps): React.ReactElement | null => {
  const edgeClassName = targetEdge ? edgeClassNames[targetEdge] : undefined;
  if (!isDragging || !edgeClassName) {
    return null;
  }

  return (
    <div
      className={classNames(styles.dockZoneIndicator, edgeClassName)}
      data-dock-edge={targetEdge}
    />
  );
};
