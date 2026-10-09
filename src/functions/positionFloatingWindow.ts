import type { WindowRect } from "../components/interface";
import { chkPosition } from "./chkPosition";

export const positionFloatingWindow = (element: HTMLDivElement, savedRect: WindowRect | null) => {
  const width = savedRect?.width ?? element.offsetWidth ?? 300;
  const height = savedRect?.height ?? element.offsetHeight ?? 200;
  const left = savedRect?.x ?? Math.max(16, (window.innerWidth - width) / 2) + window.scrollX;
  const top = savedRect?.y ?? Math.max(16, (window.innerHeight - height) / 2) + window.scrollY;
  element.style.left = `${left}px`;
  element.style.top = `${top}px`;
  if (savedRect?.width !== undefined) element.style.width = `${savedRect.width}px`;
  if (savedRect?.height !== undefined) element.style.height = `${savedRect.height}px`;
  element.style.transform = "";
  const position = chkPosition({ current: element });
  element.style.transform = `translate(${position.translateX}px, ${position.translateY}px)`;
  return { x: position.translateX, y: position.translateY };
};
