import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import styles from "./AutoHeight.module.css";

interface AutoHeightProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hide?: boolean;
  duration?: number; // transition duration in ms
}

export function AutoHeight({
  children,
  hide,
  duration = 300,
  ...rest
}: AutoHeightProps): JSX.Element {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);
  const targetChildren = useMemo<React.ReactNode>(
    () => (hide || !children ? <div style={{ height: "1px" }} /> : children),
    [children, hide],
  );

  const setTargetHeight = useCallback(() => {
    const inner = innerRef.current;

    // Initial draw to get the height of children and deployed children
    const deployedHeight = hide ? 1 : (inner?.offsetHeight ?? 0);
    setHeight(deployedHeight);
  }, [hide]);

  // Add ResizeObserver to update height on content resize, debounced
  useEffect(() => {
    const transition = innerRef.current;
    if (transition) {
      const observer = new ResizeObserver(() => {
        setTargetHeight();
      });

      observer.observe(transition);

      return () => {
        observer.disconnect();
      };
    }
  }, [setTargetHeight]);

  // Trigger height change on children update
  useLayoutEffect(() => {
    setTargetHeight();
  }, [setTargetHeight, children]);

  return (
    <div
      {...rest}
      className={styles.autoHeightWrapper}
      ref={wrapperRef}
      style={{
        ...rest.style,
        height: height ? `${height}px` : "auto",
        transitionDuration: `${duration}ms`,
      }}
    >
      <div
        className={styles.autoHeightInner}
        ref={innerRef}
      >
        {targetChildren}
      </div>
    </div>
  );
}

AutoHeight.displayName = "AutoHeight";
