export interface IconProps {
  size?: number;
}

interface SvgIconProps extends IconProps {
  path: string;
}

/** 16x16 viewBox single-path icon that inherits the current text colour */
export const SvgIcon = ({ path, size = 16 }: SvgIconProps): React.ReactElement => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    fill="currentColor"
    viewBox="0 0 16 16"
    aria-hidden="true"
  >
    <path d={path} />
  </svg>
);
