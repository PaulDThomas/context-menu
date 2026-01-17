import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from "react";
import styles from "./AutoHeight.module.css";

interface AutoHeightProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hide?: boolean;
  duration?: number; // transition duration in ms
}

type AnimationState = "closed" | "opening" | "open" | "closing";

export function AutoHeight({
  children,
  hide = false,
  duration = 300,
  ...rest
}: AutoHeightProps): React.ReactElement {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [animationState, setAnimationState] = useState<AnimationState>(!hide ? "open" : "closed");

  const rafRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const targetChildren: React.ReactNode =
    animationState === "closed" || !children ? null : children;

  const setTargetHeight = useEffectEvent((newHeight: number) => {
    setHeight(newHeight);
  });

  const transitionToOpening = useEffectEvent((): void => {
    // Cancel any pending close timeout
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setAnimationState("opening");

    const id = window.requestAnimationFrame(() => {
      rafRef.current = null;
      setTargetHeight(1);

      const frameId = window.requestAnimationFrame(() => {
        const inner = innerRef.current;
        if (inner) {
          setTargetHeight(inner.offsetHeight);
          setAnimationState("open");
        }
      });
      rafRef.current = frameId;
    });
    rafRef.current = id;
  });

  const transitionToClosing = useEffectEvent((): void => {
    // Cancel any pending RAF
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    setAnimationState("closing");
    setTargetHeight(1);

    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null;
      setAnimationState("closed");
    }, duration);
  });

  useLayoutEffect(() => {
    if (!hide) {
      // Want to show: transition to open
      if (animationState === "closed" || animationState === "closing") {
        transitionToOpening();
      }
      // If already opening or open, stay in that state
    } else {
      // Want to hide: transition to closed
      if (animationState === "open" || animationState === "opening") {
        transitionToClosing();
      }
    }
  }, [hide, animationState]);

  // Setup ResizeObserver to track content size changes
  useEffect(() => {
    const transition = innerRef.current;
    if (transition) {
      const observer = new ResizeObserver(() => {
        if (animationState === "open") {
          setTargetHeight(transition!.offsetHeight);
        }
      });

      observer.observe(transition!);

      return () => {
        observer.disconnect();
      };
    }
  }, [animationState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  return (
    <div
      {...rest}
      className={styles.autoHeightWrapper}
      ref={wrapperRef}
      style={{
        ...rest.style,
        display: animationState === "closed" ? "none" : undefined,
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
