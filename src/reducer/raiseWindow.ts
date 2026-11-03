import { raise } from "./helpers";
import type { DockingState } from "./types";

export type RaiseWindowAction = { type: "raiseWindow"; id: string };

export const raiseWindow = (state: DockingState, action: RaiseWindowAction): DockingState => {
  const zOrder = raise(state.zOrder, action.id);
  return zOrder === state.zOrder ? state : { ...state, zOrder };
};
