import { ReactNode, useEffect } from "react";

interface ContextWindowStackProps {
  id?: string;
  minZIndex?: number;
  children?: JSX.Element[] | JSX.Element | ReactNode;
}

/**
 * @deprecated ContextWindowStack is no longer required. ContextWindow now manages z-index automatically.
 * This component is kept for backwards compatibility and will be removed in a future version.
 * You can safely remove the ContextWindowStack wrapper from your code.
 *
 * Note: The `id` and `minZIndex` props are now ignored and have no effect. They remain in the interface for backward compatibility only.
 */
export const ContextWindowStack = ({ children }: ContextWindowStackProps): JSX.Element => {
  useEffect(() => {
    console.warn(
      "ContextWindowStack is deprecated and no longer required. ContextWindow now manages z-index automatically. Please remove the ContextWindowStack wrapper from your code.",
    );
  }, []);

  return <>{children}</>;
};

ContextWindowStack.displayName = "ContextWindowStack";
