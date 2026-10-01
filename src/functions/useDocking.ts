import { useContext } from "react";
import { DockingContext } from "../components/DockingContext";
import type { DockingContextType } from "../components/interface";

export const useDocking = (): DockingContextType => {
  const context = useContext(DockingContext);
  if (!context) {
    throw new Error("useDocking must be used within a DockingProvider");
  }
  return context;
};
