import type { DockEdge } from "../interface";
import { IconProps, SvgIcon } from "./SvgIcon";

interface DockIconProps extends IconProps {
  edge?: DockEdge;
}

const paths: Record<DockEdge, string> = {
  left: "M1 2h14v12H1V2zm1 1v10h3V3H2zm4 0v10h8V3H6zm7 4.5h-3v-2L7 8l3 2.5v-2h3v-1z",
  right: "M1 2h14v12H1V2zm1 1v10h8V3H2zm9 0v10h3V3h-3zM3 7.5h3v-2L9 8l-3 2.5v-2H3v-1z",
  top: "M1 2h14v12H1V2zm1 1v2h12V3H2zm0 3v7h12V6H2zm5.5 6V9h-2L8 6l2.5 3h-2v3h-1z",
  bottom: "M1 2h14v12H1V2zm1 1v7h12V3H2zm0 8v2h12v-2H2zm5.5-7v3h-2L8 10l2.5-3h-2V4h-1z",
};

export const DockIcon = ({ size, edge = "right" }: DockIconProps): React.ReactElement => (
  <SvgIcon
    size={size}
    path={paths[edge]}
  />
);
