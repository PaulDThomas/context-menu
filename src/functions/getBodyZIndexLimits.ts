import { MAX_Z_INDEX, MIN_Z_INDEX } from "./contextWindowConstants";
import { readLimit } from "./readLimit";

const MIN_ATTRIBUTE = "data-acm-min-z-index";
const MAX_ATTRIBUTE = "data-acm-max-z-index";

export const getBodyZIndexLimits = (): { min: number; max: number } => {
  const body = typeof document === "undefined" ? null : document.body;
  const min = readLimit(body?.getAttribute(MIN_ATTRIBUTE) ?? null, MIN_Z_INDEX);
  const maximum = readLimit(body?.getAttribute(MAX_ATTRIBUTE) ?? null, MAX_Z_INDEX);
  const max = maximum > min ? maximum : min + MAX_Z_INDEX - MIN_Z_INDEX;
  return { min, max };
};
