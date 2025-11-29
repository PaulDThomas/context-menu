import { ReactNode, useEffect } from "react";

interface ContextWindowStackProps {
  id?: string;
  minZIndex?: number;
  children?: React.ReactElement[] | React.ReactElement | ReactNode;
}

declare global {
  interface GlobalThis {
    __ContextWindowStackRendered?: boolean;
  }
}

const SESSION_KEY = "context-menu.ContextWindowStack.rendered";

/**
 * @deprecated ContextWindowStack is no longer required. ContextWindow now manages z-index automatically.
 * This component is kept for backwards compatibility and will be removed in a future version.
 * It will render its children only once per browser session and then return `null` on subsequent mounts.
 *
 * Note: The `id` and `minZIndex` props are ignored and have no effect. They remain in the interface for backward compatibility only.
 */

export const ContextWindowStack = ({ children }: ContextWindowStackProps): React.ReactElement => {
  useEffect(() => {
    const doWarn = () =>
      console.warn(
        "ContextWindowStack is deprecated and no longer required. ContextWindow now manages z-index automatically. Please remove the ContextWindowStack wrapper from your code.",
      );

    try {
      // Prefer sessionStorage so the warning lasts for the browser session.
      if (typeof window !== "undefined" && window.sessionStorage) {
        const already = window.sessionStorage.getItem(SESSION_KEY);
        if (!already) {
          window.sessionStorage.setItem(SESSION_KEY, "1");
          doWarn();
        }
        return;
      }
    } catch {
      // sessionStorage may be unavailable (privacy mode). Fall through to global fallback.
    }

    // Fallback: use a global flag for environments where sessionStorage isn't available.
    const g = globalThis as unknown as { __ContextWindowStackRendered?: boolean };
    if (!g.__ContextWindowStackRendered) {
      g.__ContextWindowStackRendered = true;
      doWarn();
    }
  }, []);

  return <>{children}</>;
};

ContextWindowStack.displayName = "ContextWindowStack";
