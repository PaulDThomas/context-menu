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
}: ContextWindowTitleButtonProps): React.ReactElement => {
  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    onClick?.();
  };

  return (
    <div
      className={className}
      role="button"
      aria-label={label}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={handleClick}
      title={title}
    >
      {children}
    </div>
  );
};
