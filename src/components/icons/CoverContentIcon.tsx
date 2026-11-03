import type { DockEdge } from "../interface";
import { IconProps, SvgIcon } from "./SvgIcon";

interface CoverContentIconProps extends IconProps {
  edge?: DockEdge;
}

const paths: Record<DockEdge, string> = {
  left: "M2 2h12v12H2v-2h1v1h10V3H3v1H2V2zM1 4h6v8H1V4zm1 1v6h4V5H2z",
  right: "M2 2h12v2h-1V3H3v10h10v-1h1v2H2V2zM9 4h6v8H9V4zm1 1v6h4V5h-4z",
  top: "M2 2h2v1H3v10h10V3h-1V2h2v12H2V2zM4 1h8v6H4V1zm1 1v4h6V2H5z",
  bottom: "M2 2h12v12h-2v-1h1V3H3v10h1v1H2V2zM4 9h8v6H4V9zm1 1v4h6v-4H5z",
};

export const CoverContentIcon = ({
  size,
  edge = "right",
}: CoverContentIconProps): React.ReactElement => (
  <SvgIcon
    size={size}
    path={paths[edge]}
  />
);
