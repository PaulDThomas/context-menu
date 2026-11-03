import type { DockEdge } from "../interface";
import { IconProps, SvgIcon } from "./SvgIcon";

interface PushContentIconProps extends IconProps {
  edge?: DockEdge;
}

const paths: Record<DockEdge, string> = {
  left: "M1 2h14v12H1V2zm1 1v10h3V3H2zm4 0v10h8V3H6zm1 4.5h3v-2L13 8l-3 2.5v-2H7v-1z",
  right: "M1 2h14v12H1V2zm1 1v10h8V3H2zm9 0v10h3V3h-3zM9 7.5H6v-2L3 8l3 2.5v-2h3v-1z",
  top: "M1 2h14v12H1V2zm1 1v2h12V3H2zm0 3v7h12V6H2zm5.5 1v2h-2L8 12l2.5-3h-2V7h-1z",
  bottom: "M1 2h14v12H1V2zm1 1v7h12V3H2zm0 8v2h12v-2H2zm5.5-2V7h-2L8 4l2.5 3h-2v2h-1z",
};

export const PushContentIcon = ({
  size,
  edge = "left",
}: PushContentIconProps): React.ReactElement => (
  <SvgIcon
    size={size}
    path={paths[edge]}
  />
);
