import { IconProps, SvgIcon } from "./SvgIcon";

export const DockIcon = ({ size }: IconProps): React.ReactElement => (
  <SvgIcon
    size={size}
    path="M8 1H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h5V1zm5 0v12h-1V1h1z"
  />
);
