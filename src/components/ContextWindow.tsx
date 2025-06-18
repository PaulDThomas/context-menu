import { ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { chkPosition } from "../functions/chkPosition";
import styles from "./ContextWindow.module.css";
import { ContextWindowStackContext } from "./ContextWindowStack";

interface ContextWindowProps extends React.HTMLAttributes<HTMLDivElement> {
  id: string;
  visible: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  title: string;
  titleElement?: ReactNode;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export const ContextWindow = ({
  id,
  visible,
  title,
  titleElement,
  children,
  onOpen,
  onClose,
  ...rest
}: ContextWindowProps): JSX.Element => {
  const windowStack = useContext(ContextWindowStackContext);
  const windowId = useRef<number | null>(null);
  const divRef = useRef<HTMLDivElement | null>(null);
  const windowRef = useRef<HTMLDivElement | null>(null);
  const [windowInDOM, setWindowInDOM] = useState<boolean>(false);
  const [windowVisible, setWindowVisible] = useState<boolean>(false);
  const zIndex = useMemo(() => {
    return windowStack?.currentWindows.find((w) => w.windowId === windowId.current)?.zIndex ?? 1;
  }, [windowStack?.currentWindows]);

  // Position
  const windowPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [moving, setMoving] = useState<boolean>(false);

  const move = useCallback((x: number, y: number) => {
    if (windowRef.current && windowPos.current) {
      const window = windowRef.current;
      const pos = windowPos.current;
      pos.x += x;
      pos.y += y;
      window.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
    }
  }, []);

  const checkPosition = useCallback(() => {
    const chkPos = chkPosition(windowRef);
    move(chkPos.translateX, chkPos.translateY);
  }, [move]);

  const mouseMove = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      move(e.movementX, e.movementY);
    },
    [move],
  );

  const mouseUp = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setMoving(false);
      checkPosition();
      document.removeEventListener("mousemove", mouseMove);
      document.removeEventListener("mouseup", mouseUp);
      window.removeEventListener("resize", checkPosition);
      if (e.target && (e.target instanceof HTMLElement || e.target instanceof SVGElement))
        e.target.style.userSelect = "auto";
    },
    [checkPosition, mouseMove],
  );

  // Update visibility
  useEffect(() => {
    if (windowStack) {
      // Visible set, but not in DOM
      if (visible && !windowInDOM) {
        setWindowInDOM(true);
      } else if (visible && windowInDOM && !windowVisible) {
        if (!windowId.current) {
          const maxWindowId = Math.max(0, ...windowStack.currentWindows.map((w) => w.windowId));
          windowId.current = maxWindowId + 1;
        }
        windowStack.pushToTop(windowId.current);
        setWindowVisible(visible);
        onOpen?.();
        // Get starting position
        if (divRef.current && windowRef.current) {
          const parentPos = divRef.current.getBoundingClientRect();
          const pos = windowRef.current.getBoundingClientRect();
          const windowHeight = pos.bottom - pos.top;
          windowRef.current.style.left = `${parentPos.left}px`;
          windowRef.current.style.top = `${
            parentPos.bottom + windowHeight < window.innerHeight
              ? parentPos.bottom
              : Math.max(0, parentPos.top - windowHeight)
          }px`;
          windowRef.current.style.transform = "";
          windowPos.current = { x: 0, y: 0 };
        }
        checkPosition();
      } else if (windowId.current && !visible && windowVisible) {
        setWindowVisible(false);
      } else if (windowId.current && !visible && windowInDOM) {
        setWindowInDOM(false);
      }
    }
  }, [checkPosition, onOpen, visible, windowInDOM, windowStack, windowVisible]);

  return (
    <div
      className={styles.contextWindowAnchor}
      ref={divRef}
    >
      {!windowStack && (
        <div {...rest}>
          {process.env.NODE_ENV !== "production" && (
            <div
              style={{ backgroundColor: "red", color: "white", padding: "8px", fontSize: "48px" }}
            >
              WARNING: No ContextWindowStack found
            </div>
          )}
          {children}
        </div>
      )}
      {windowStack &&
        windowInDOM &&
        createPortal(
          <div
            {...rest}
            ref={windowRef}
            id={id}
            className={[styles.contextWindow, rest.className].filter((c) => c).join(" ")}
            style={{
              ...rest.style,
              opacity: moving ? 0.8 : windowVisible ? 1 : 0,
              visibility: windowVisible ? "visible" : "hidden",
              zIndex: zIndex ?? 1,
              minHeight: rest.style?.minHeight ?? "150px",
              minWidth: rest.style?.minWidth ?? "200px",
              maxHeight: rest.style?.maxHeight ?? "1000px",
              maxWidth: rest.style?.maxWidth ?? "1000px",
            }}
            onClickCapture={(e) => {
              if (windowId.current) windowStack.pushToTop(windowId.current);
              rest.onClickCapture?.(e);
            }}
          >
            <div
              className={[styles.contextWindowTitle, moving ? styles.moving : ""]
                .filter((c) => c !== "")
                .join(" ")}
              onMouseDown={(e: React.MouseEvent) => {
                if (e.target && (e.target instanceof HTMLElement || e.target instanceof SVGElement))
                  e.target.style.userSelect = "none";
                setMoving(true);
                if (windowId.current) windowStack.pushToTop(windowId.current);
                document.addEventListener("mouseup", mouseUp);
                document.addEventListener("mousemove", mouseMove);
                window.addEventListener("resize", () => checkPosition());
              }}
            >
              <div
                className={styles.contextWindowTitleText}
                title={title}
              >
                {titleElement ? titleElement : title}
              </div>
              <div
                className={styles.contextWindowTitleClose}
                role="button"
                aria-label="Close"
                onClick={onClose}
                title={`Close ${title && title.trim() !== "" ? title : "window"}`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                >
                  <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
                </svg>
              </div>
            </div>
            <div className={styles.contextWindowBody}>
              <div>{children}</div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

ContextWindow.displayName = "ContextWindow";
