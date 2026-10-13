import { IconProps, SvgIcon } from "./SvgIcon";

export const UndockIcon = ({ size }: IconProps): React.ReactElement => (
  <SvgIcon
    size={size}
    path="M5 2h10v12H5v-3h1v2h8V3H6v2H5V2zM1 8l3-2.5v2h5v1H4v2L1 8z"
  />
);
