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
  <button
    data-testid={`mock-title-button-${label}`}
    data-class-name={className}
    data-title={title}
    onClick={onClick}
  >
    {children}
  </button>
);
