import { Fragment, useState } from "react";
import { ContextWindow } from "../../src/components/ContextWindow";
import { ContextWindowStack } from "../../src/components/ContextWindowStack";
import { AutoHeight, ClickForMenu, ContextMenuHandler } from "../../src/main";
import { ColourDiv } from "./ColourDiv";

export const App = () => {
  const [showWindow, setShowWindow] = useState<boolean[]>(Array.from({ length: 5 }, () => false));
  const [height, setHeight] = useState<number | null>(null);
  const [thing, setThing] = useState<string>("Thing1");

  return (
    <div className="app-holder">
      <div className="app-border">
        <div className="app-inner">
          <div className="col">
            <ContextMenuHandler
              menuItems={[{ label: "Outer item", action: () => console.log("Outer item") }]}
              style={{ backgroundColor: "lightblue", margin: "6px" }}
            >
              <ColourDiv
                text="Div 1"
                contentEditable
                onBlur={(e) => {
                  console.log("Div 1 content:Blur: ", e.currentTarget.textContent);
                }}
              />
              <ColourDiv
                text="Div 2 is here for everyone"
                showLowMenu
                style={{
                  resize: "both",
                  overflow: "auto",
                  padding: "0.5rem",
                  backgroundColor: "lightgreen",
                }}
              />
              <ColourDiv
                text="Div 3"
                width={300}
                height={300}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                }}
              >
                <ContextMenuHandler
                  menuItems={[
                    {
                      label: (
                        <hr
                          style={{
                            flexGrow: 1,
                            cursor: "none",
                            margin: "0",
                            padding: "4",
                            border: "2px solid green",
                          }}
                        />
                      ),
                    },
                  ]}
                >
                  <ColourDiv text="Div 3.1">
                    <ClickForMenu
                      id={`c4m`}
                      menuItems={[
                        {
                          label: "Click For Menu action 1",
                          action: () => console.log("Action from ClickForMenu"),
                        },
                        {
                          label: "Click For Menu action 2",
                          action: () => console.log("Action from ClickForMenu"),
                        },
                        {
                          label: "Click For Menu action 3",
                          action: () => console.log("Action from ClickForMenu"),
                        },
                        {
                          label: "Click For Menu action 4",
                          action: () => console.log("Action from ClickForMenu"),
                        },
                      ]}
                    >
                      Click For Menu
                    </ClickForMenu>
                  </ColourDiv>
                </ContextMenuHandler>
              </ColourDiv>
            </ContextMenuHandler>
          </div>

          <div className="col">
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
                    <label htmlFor={`window-check-${i}`}>Show window {i}</label>
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
          <div
            className="col"
            style={{
              alignItems: "center",
              position: "relative",
            }}
          >
            <select
              name="auto-height-select"
              style={{ marginTop: "1rem", order: 9, right: "1rem" }}
              value={`${height}`}
              onChange={(e) => setHeight(parseInt(e.currentTarget.value))}
            >
              <option value={""}>Auto height</option>
              <option value={300}>300</option>
              <option value={600}>600</option>
              <option value={900}>900</option>
            </select>
            <select
              name="auto-height-thing-select"
              style={{ marginTop: "1rem", order: 10, left: "1rem" }}
              value={thing}
              onChange={(e) => setThing(e.currentTarget.value)}
            >
              <option>Thing1</option>
              <option>Thing2</option>
              <option>Nowt</option>
            </select>

            <AutoHeight
              hide={thing === "Thing2"}
              style={{
                order: 1,
                marginTop: "1rem",
                width: "calc(100% - 2rem)",
                backgroundColor: "lightgrey",
              }}
            >
              {thing === "Thing1" ? (
                <div
                  style={{
                    padding: "1rem",
                    backgroundColor: "lightgrey",
                    height: height ? `${height}px` : "auto",
                  }}
                >
                  Resize to {`${height}`}
                </div>
              ) : thing === "Thing2" ? (
                <>Blah blah blah!!!!</>
              ) : (
                <div style={{ padding: "1rem" }}>Nothing to see here</div>
              )}
            </AutoHeight>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
