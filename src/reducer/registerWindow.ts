import type { DockingState } from "./types";

export type RegisterWindowAction = { type: "registerWindow"; id: string };

export const registerWindow = (state: DockingState, action: RegisterWindowAction): DockingState => {
  if (state.zOrder.includes(action.id)) {
    return state;
  }
  return {
    ...state,
    zOrder: [...state.zOrder, action.id],
  };
};
