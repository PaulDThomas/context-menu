import type { DockingContextType } from "../components/interface";
import { useOptionalDocking } from "./useOptionalDocking";

/**
 * Access docking operations and state selectors from the nearest `DockingProvider`.
 *
 * @throws {Error} If called outside a `DockingProvider`.
 */
export const useDocking = (): DockingContextType => {
  const docking = useOptionalDocking();
  if (!docking) {
    throw new Error("useDocking must be used within a DockingProvider");
  }
  return docking;
};
