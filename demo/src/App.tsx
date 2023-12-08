import { Fragment, useState } from "react";
import { ContextWindow } from "../../src/components/ContextWindow";
import { ContextWindowStack } from "../../src/components/ContextWindowStack";
import { ContextMenuHandler } from "../../src/main";
import { ColourDiv } from "./ColourDiv";

export const App = () => {
  const [showWindow, setShowWindow] = useState<boolean[]>(Array.from({ length: 5 }, () => false));
  return (
    <div className="app-holder">
      <div className="app-border">
        <div
          className="app-inner"
          style={{ display: "flex", flexDirection: "row" }}
        >
          <div>
            <ColourDiv text="Div 1" />
            <ColourDiv
              text="Div 2 is here for everyone"
              showLowMenu
            />
            <ColourDiv text="Div 3" />
          </div>
          <div>
            <ContextWindowStack>
              {Array.from({ length: 5 }, (_, k) => k).map((i) => (
                <Fragment key={i}>
                  <div
                    style={{ height: "30px", padding: "1rem" }}
                    onClick={() => {
                      setShowWindow(showWindow.map((b, ix) => (ix === i ? !b : b)));
                    }}
                  >
                    <input
                      id={`window-check-${i}`}
                      type="checkbox"
                      checked={showWindow[i]}
                      onChange={(e) => {
                        setShowWindow(
                          showWindow.map((b, ix) => (ix === i ? e.currentTarget.checked : b)),
                        );
                      }}
                    />
                    <label htmlFor="window-check">Show window {i}</label>
                  </div>
                  <ContextWindow
                    id={`w-${i}`}
                    visible={showWindow[i]}
                    title={"Window with a very very very long title, that wants to be squashed"}
                    onClose={() => {
                      setShowWindow(showWindow.map((b, ix) => (ix === i ? false : b)));
                    }}
                    style={{ width: `${(i + 1) * 200}px` }}
                  >
                    <div>Hi! {i}</div>
                  </ContextWindow>
                </Fragment>
              ))}
            </ContextWindowStack>
            <pre>Visible windows: {JSON.stringify(showWindow)}</pre>
            <div>
              <ContextMenuHandler
                style={{ width: "100%", backgroundColor: "magenta" }}
                menuItems={[
                  {
                    label: "Target to console",
                    action: (target?: Range | null) => {
                      if (target) {
                        const frag = target.cloneContents();
                        const div = document.createElement("div");
                        div.append(frag);
                        console.log(div.innerHTML);
                      }
                    },
                  },
                  { label: <hr /> },
                  {
                    label: <span>This does nothing</span>,
                  },
                ]}
              >
                <span style={{ backgroundColor: "white" }}>Hello</span>
                <span style={{ backgroundColor: "green" }}> Green </span>
                <span style={{ backgroundColor: "lightblue" }}>Grass</span>
              </ContextMenuHandler>
            </div>
            <hr />
            <div>
              <ContextMenuHandler
                style={{ width: "100%", backgroundColor: "magenta" }}
                showLowMenu
                menuItems={[
                  {
                    label: "Target to console",
                    action: (target?: Range | null) => {
                      if (target) {
                        const frag = target.cloneContents();
                        const div = document.createElement("div");
                        div.append(frag);
                        console.log(div.innerHTML);
                      }
                    },
                  },
                ]}
              >
                <div
                  contentEditable
                  suppressContentEditableWarning
                >
                  There is something to select here
                </div>
              </ContextMenuHandler>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
