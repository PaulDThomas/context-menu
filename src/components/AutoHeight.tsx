import { useLayoutEffect, useRef, useState } from "react";
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
}: AutoHeightProps): React.ReactNode {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const transitionRef = useRef<HTMLDivElement>(null);
  const [deployedChildren, setDeployedChildren] = useState<React.ReactNode>(children);
  const [height, setHeight] = useState<number | null>(null);
  const isResizing = useRef<"resize" | null>(null);

  // Trigger height change on children update
  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    const inner = innerRef.current;
    const transition = transitionRef.current;
    if (!wrapper || !inner || !transition) return;

    // Initial draw to get the height of children and deployed children
    const childrenHeight = inner.offsetHeight ?? 0;
    const deployedHeight = transition.offsetHeight ?? 0;

    inner.dataset.height = `${childrenHeight}`;
    transition.dataset.height = `${deployedHeight}`;

    // if deployed children height is different, update the state
    if (childrenHeight !== deployedHeight) {
      switch (isResizing.current) {
        case null: {
          isResizing.current = "resize";
          break;
        }
        case "resize":
          break;
      }
      setHeight(deployedHeight);

      const handleTransitionEnd = () => {
        wrapper.removeEventListener("transitionend", handleTransitionEnd);
        setDeployedChildren(children);
        isResizing.current = null;
      };

      wrapper.addEventListener("transitionend", handleTransitionEnd);
    } else if (childrenHeight !== height) {
      setHeight(childrenHeight);
      setDeployedChildren(hide || !children ? <div style={{ height: "1px" }} /> : children);
    } else if (children !== deployedChildren) {
      setDeployedChildren(children);
    }
  }, [children, deployedChildren, duration, height, hide]);

  return (
    <div
      {...rest}
      className={styles.autoHeightWrapper}
      ref={wrapperRef}
      style={{
        height: height ? `${height}px` : "auto",
        transitionDuration: `${duration}ms`,
        ...rest.style,
      }}
    >
      <div
        ref={innerRef}
        className={[
          styles.autoHeightInner,
          isResizing.current ? styles[isResizing.current] : "",
        ].join(" ")}
        style={isResizing.current ? { transition: `opacity ${duration}ms ease-in-out` } : undefined}
      >
        {deployedChildren}
      </div>
      <div
        className={[
          styles.autoHeightTransition,
          isResizing.current ? styles[isResizing.current] : "",
        ].join(" ")}
        ref={transitionRef}
        style={isResizing.current ? { transition: `opacity ${duration}ms ease-in-out` } : undefined}
      >
        {hide || !children ? <div style={{ height: "1px" }} /> : children}
      </div>
    </div>
  );
}
