import { createContext, useState } from 'react';

export interface ContextWindowZIndex {
  windowId: number;
  zIndex: number;
}

export interface ContextWindowStackContextProps {
  currentWindows: ContextWindowZIndex[];
  pushToTop: (ret: number) => void;
}

export const ContextWindowStackContext = createContext<ContextWindowStackContextProps | null>(null);

interface ContextWindowStackProps {
  id?: string;
  minZIndex?: number;
  children?: JSX.Element[] | JSX.Element;
}

const pushToTop = (
  windowId: number,
  minZIndex: number,
  windowList: ContextWindowZIndex[],
  setWindowList: (ret: ContextWindowZIndex[]) => void,
) => {
  const otherWindows = windowList
    .filter((w) => w.windowId !== windowId)
    .map((w, i) => ({ windowId: w.windowId, zIndex: minZIndex + i }));
  setWindowList([...otherWindows, { windowId, zIndex: minZIndex + otherWindows.length }]);
};

export const ContextWindowStack = ({
  minZIndex = 1000,
  children,
}: ContextWindowStackProps): JSX.Element => {
  const [currentWindows, setCurrentWindows] = useState<ContextWindowZIndex[]>([]);

  return (
    <ContextWindowStackContext.Provider
      value={{
        currentWindows: currentWindows.map((w) => ({
          windowId: w.windowId,
          zIndex: minZIndex + w.zIndex,
        })),
        pushToTop: (ret: number) => pushToTop(ret, minZIndex, currentWindows, setCurrentWindows),
      }}
    >
      {children}
    </ContextWindowStackContext.Provider>
  );
};
