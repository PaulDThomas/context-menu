import type { WindowZRange } from "../components/interface";
import type { DockingState } from "./types";

export type RegisterWindowAction = { type: "registerWindow"; id: string; zRange: WindowZRange };

export const registerWindow = (state: DockingState, action: RegisterWindowAction): DockingState => {
  const { id, zRange } = action;
  const current = state.zRanges.get(id);
  if (current && current.minZIndex === zRange.minZIndex && current.maxZIndex === zRange.maxZIndex) {
    return state;
  }
  const zRanges = new Map(state.zRanges).set(id, zRange);
  return {
    ...state,
    zRanges,
    zOrder: state.zOrder.includes(id) ? state.zOrder : [...state.zOrder, id],
  };
};
