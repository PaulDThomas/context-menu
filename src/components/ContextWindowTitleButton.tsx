import { ReactNode } from "react";
import styles from "./ContextWindow.module.css";

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
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onClick?.();
  };

  return (
    <button
      type="button"
      className={[styles.contextWindowTitleButton, className].filter(Boolean).join(" ")}
      aria-label={label}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={handleClick}
      title={title}
    >
      {children}
    </button>
  );
};
