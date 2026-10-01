import { ReactNode } from "react";

interface ContextWindowTitleButtonProps {
  className: string;
  label: string;
  title: string;
  onClick?: () => void;
  children: ReactNode;
}

export const ContextWindowTitleButton = ({
  className,
  label,
  title,
  onClick,
  children,
}: ContextWindowTitleButtonProps): React.ReactElement => (
  <div
    className={className}
    role="button"
    aria-label={label}
    onClick={onClick}
    title={title}
  >
    {children}
  </div>
);
