import { activateWindowOnEdge as handleActivateWindowOnEdge } from "./activateWindowOnEdge";
import { dock as handleDock } from "./dock";
import { endDockDrag as handleEndDockDrag } from "./endDockDrag";
import { raiseWindow as handleRaiseWindow } from "./raiseWindow";
import { registerWindow as handleRegisterWindow } from "./registerWindow";
import { registerWindowConfig as handleRegisterWindowConfig } from "./registerWindowConfig";
import { saveWindowPosition as handleSaveWindowPosition } from "./saveWindowPosition";
import { setActiveWindowOnEdge as handleSetActiveWindowOnEdge } from "./setActiveWindowOnEdge";
import { setDockDragEdge as handleSetDockDragEdge } from "./setDockDragEdge";
import { setPanelContentHost as handleSetPanelContentHost } from "./setPanelContentHost";
import { startDockDrag as handleStartDockDrag } from "./startDockDrag";
import { toggleAndRaiseEdge as handleToggleAndRaiseEdge } from "./toggleAndRaiseEdge";
import { toggleEdgeCollapse as handleToggleEdgeCollapse } from "./toggleEdgeCollapse";
import type { DockingAction, DockingState } from "./types";
import { undock as handleUndock } from "./undock";
import { unregisterWindow as handleUnregisterWindow } from "./unregisterWindow";

export const dockingReducer = (state: DockingState, action: DockingAction): DockingState => {
  switch (action.type) {
    case "activateWindowOnEdge":
      return handleActivateWindowOnEdge(state, action);
    case "dock":
      return handleDock(state, action);
    case "endDockDrag":
      return handleEndDockDrag(state, action);
    case "raiseWindow":
      return handleRaiseWindow(state, action);
    case "registerWindow":
      return handleRegisterWindow(state, action);
    case "registerWindowConfig":
      return handleRegisterWindowConfig(state, action);
    case "saveWindowPosition":
      return handleSaveWindowPosition(state, action);
    case "setActiveWindowOnEdge":
      return handleSetActiveWindowOnEdge(state, action);
    case "setDockDragEdge":
      return handleSetDockDragEdge(state, action);
    case "setPanelContentHost":
      return handleSetPanelContentHost(state, action);
    case "startDockDrag":
      return handleStartDockDrag(state, action);
    case "toggleAndRaiseEdge":
      return handleToggleAndRaiseEdge(state, action);
    case "toggleEdgeCollapse":
      return handleToggleEdgeCollapse(state, action);
    case "undock":
      return handleUndock(state, action);
    case "unregisterWindow":
      return handleUnregisterWindow(state, action);
  }
};
