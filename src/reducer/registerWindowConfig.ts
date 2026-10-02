import type { WindowConfig } from "../components/interface";
import type { DockingState } from "./types";

export type RegisterWindowConfigAction = {
  type: "registerWindowConfig";
  id: string;
  config: WindowConfig;
};

const areConfigsEqual = (left: WindowConfig, right: WindowConfig): boolean => {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  for (const key of keys) {
    const typedKey = key as keyof WindowConfig;
    if (left[typedKey] !== right[typedKey]) {
      return false;
    }
  }
  return true;
};

export const registerWindowConfig = (
  state: DockingState,
  action: RegisterWindowConfigAction,
): DockingState => {
  const currentConfig = state.windowConfigs.get(action.id);
  const nextConfig = currentConfig ? { ...currentConfig, ...action.config } : action.config;
  if (currentConfig && areConfigsEqual(currentConfig, nextConfig)) {
    return state;
  }

  const windowConfigs = new Map(state.windowConfigs);
  windowConfigs.set(action.id, nextConfig);
  return { ...state, windowConfigs };
};
