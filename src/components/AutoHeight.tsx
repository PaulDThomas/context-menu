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
  const [deployedChildren, setDeployedChildren] = useState<React.ReactNode>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [isResizing, setIsResizing] = useState<"draw" | "resize" | "remove" | null>(null);

  // Trigger height change on children update
  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    const inner = innerRef.current;

    // Nothing is drawn yet
    if (!wrapper || !inner) return;

    // No transitionRef means we are in the initial draw phase
    if (!transitionRef.current && deployedChildren !== children) {
      setIsResizing("draw");
      return;
    }
    // End the transition, this will remove the transitionRef from the DOM
    if (isResizing === "remove") {
      setIsResizing(null);
      return;
    }

    const transition = transitionRef?.current;
    if (!transition) return;

    // Initial draw to get the height of children and deployed children
    const childrenHeight = inner.offsetHeight ?? 0;
    const deployedHeight = transition.offsetHeight ?? 0;

    // if deployed children height is different, update the state
    if (childrenHeight !== deployedHeight) {
      switch (isResizing) {
        case "draw": {
          setIsResizing("resize");
          break;
        }
        case "resize":
          break;
      }
      setHeight(deployedHeight);

      const handleTransitionEnd = () => {
        wrapper.removeEventListener("transitionend", handleTransitionEnd);
        setDeployedChildren(children);
        setIsResizing("remove");
      };

      wrapper.addEventListener("transitionend", handleTransitionEnd);
    }
    // if children height is different, update the state
    else if (childrenHeight !== height) {
      setHeight(childrenHeight);
      setDeployedChildren(hide || !children ? <div style={{ height: "1px" }} /> : children);
      setIsResizing("remove");
    }
    // if just the children have changed, update the deployed children
    else if (children !== deployedChildren) {
      setDeployedChildren(children);
      setIsResizing("remove");
    }
  }, [children, deployedChildren, height, hide, isResizing]);

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
        className={[styles.autoHeightInner, isResizing ? styles[isResizing] : ""].join(" ")}
        style={isResizing ? { transition: `opacity ${duration}ms ease-in-out` } : undefined}
      >
        {deployedChildren}
      </div>
      {isResizing && (
        <div
          className={[styles.autoHeightTransition, isResizing ? styles[isResizing] : ""].join(" ")}
          ref={transitionRef}
          style={isResizing ? { transition: `opacity ${duration}ms ease-in-out` } : undefined}
        >
          {hide || !children ? <div style={{ height: "1px" }} /> : children}
        </div>
      )}
    </div>
  );
}
