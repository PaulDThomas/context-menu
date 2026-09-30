import { useContext } from "react";
import { DockingContext } from "./DockingContext";
import type { DockingContextType } from "./interface";

export const useDocking = (): DockingContextType => {
  const context = useContext(DockingContext);
  if (!context) {
    throw new Error("useDocking must be used within a DockingProvider");
  }
  return context;
};
