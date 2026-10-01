import type { DockEdge } from "../components/interface";
import type { DockingState } from "./types";

export type SetPanelContentHostAction = {
  type: "setPanelContentHost";
  edge: DockEdge;
  host: HTMLDivElement | null;
};

export const setPanelContentHost = (
  state: DockingState,
  action: SetPanelContentHostAction,
): DockingState => {
  const { edge, host } = action;
  if ((state.panelContentHosts.get(edge) ?? null) === host) {
    return state;
  }
  const panelContentHosts = new Map(state.panelContentHosts);
  if (host) {
    panelContentHosts.set(edge, host);
  } else {
    panelContentHosts.delete(edge);
  }
  return { ...state, panelContentHosts };
};
