import { useMemo } from "react";
import styles from "./DockZoneIndicator.module.css";
import type { DockEdge } from "./interface";

interface DockZoneIndicatorProps {
  targetEdge: DockEdge | null;
  isDragging: boolean;
}

const INDICATOR_SIZE = 60;

export const DockZoneIndicator = ({
  targetEdge,
  isDragging,
}: DockZoneIndicatorProps): React.ReactElement | null => {
  const indicatorStyle = useMemo(() => {
    if (!isDragging || !targetEdge) {
      return { display: "none" };
    }

    const baseStyle: React.CSSProperties = {
      position: "fixed",
      pointerEvents: "none",
      zIndex: 9999,
    };

    switch (targetEdge) {
      case "top":
        return {
          ...baseStyle,
          top: 0,
          left: 0,
          right: 0,
          height: `${INDICATOR_SIZE}px`,
          background: "linear-gradient(to bottom, rgba(79, 172, 254, 0.3), transparent)",
          borderBottom: "3px solid rgba(79, 172, 254, 0.8)",
        };
      case "bottom":
        return {
          ...baseStyle,
          bottom: 0,
          left: 0,
          right: 0,
          height: `${INDICATOR_SIZE}px`,
          background: "linear-gradient(to top, rgba(79, 172, 254, 0.3), transparent)",
          borderTop: "3px solid rgba(79, 172, 254, 0.8)",
        };
      case "left":
        return {
          ...baseStyle,
          left: 0,
          top: 0,
          bottom: 0,
          width: `${INDICATOR_SIZE}px`,
          background: "linear-gradient(to right, rgba(79, 172, 254, 0.3), transparent)",
          borderRight: "3px solid rgba(79, 172, 254, 0.8)",
        };
      case "right":
        return {
          ...baseStyle,
          right: 0,
          top: 0,
          bottom: 0,
          width: `${INDICATOR_SIZE}px`,
          background: "linear-gradient(to left, rgba(79, 172, 254, 0.3), transparent)",
          borderLeft: "3px solid rgba(79, 172, 254, 0.8)",
        };
      default:
        return { display: "none" };
    }
  }, [isDragging, targetEdge]);

  return (
    <div
      className={styles.dockZoneIndicator}
      style={indicatorStyle}
    />
  );
};
