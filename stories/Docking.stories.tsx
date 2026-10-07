import type { Meta, StoryObj } from "@storybook/react-vite";
import { ReactNode, useRef, useState } from "react";
import { ContextWindow, DockingProvider, type DockEdge } from "../src/components";
import { ContextWindowHandle } from "../src/components/ContextWindow";

const meta = {
  title: "Components/Docking",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const dockingViewportSize = {
  width: "calc(100vw - var(--dock-panel-inset-left, 0px) - var(--dock-panel-inset-right, 0px))",
  height: "calc(100vh - var(--dock-panel-inset-top, 0px) - var(--dock-panel-inset-bottom, 0px))",
};

const dummyContent = (title: string) => (
  <div style={{ padding: "15px" }}>
    <h3 style={{ margin: "0 0 10px 0", fontSize: "14px" }}>{title}</h3>
    <p style={{ margin: "0 0 8px 0", fontSize: "12px", color: "#666" }}>
      This is a dockable window. You can:
    </p>
    <ul style={{ margin: "0", paddingLeft: "20px", fontSize: "12px", color: "#666" }}>
      <li>Drag near screen edges to snap-dock</li>
      <li>Click the dock button to dock to right edge</li>
      <li>Drag away from edge to undock</li>
      <li>Click undock button when docked</li>
    </ul>
  </div>
);

export const KitchenSink: Story = {
  render: () => {
    const DockingKitchenSink = () => {
      const [visibleWindows, setVisibleWindows] = useState<Record<string, boolean>>({
        "window-1": true,
        "window-2": true,
        "window-3": true,
        "window-4": true,
        "window-5": false,
        "window-6": true,
        "window-7": true,
      });

      const windowRefs = useRef<Record<string, ContextWindowHandle | null>>({});

      const toggleWindow = (id: string) => {
        setVisibleWindows((prev) => ({
          ...prev,
          [id]: !prev[id],
        }));
      };

      const handleDockWindow = (id: string, edge: DockEdge) => {
        const ref = windowRefs.current[id];
        if (ref) {
          ref.dock(edge);
        }
      };

      return (
        <DockingProvider>
          <div
            style={{
              ...dockingViewportSize,
              backgroundColor: "#f5f5f5",
              display: "grid",
              gridTemplateColumns: "160px 1fr 160px",
              gridTemplateRows: "48px 1fr 48px",
              gap: 0,
              overflow: "hidden",
            }}
          >
            {/* Center Content Area */}
            <div
              style={{
                gridColumn: 2,
                gridRow: 2,
                position: "relative",
                overflow: "auto",
                padding: "20px",
              }}
            >
              {/* Control Panel */}
              <div
                style={{
                  position: "absolute",
                  top: "10px",
                  left: "10px",
                  backgroundColor: "white",
                  border: "1px solid #ccc",
                  borderRadius: "8px",
                  padding: "15px",
                  maxWidth: "300px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  zIndex: 100,
                }}
              >
                <h3 style={{ margin: "0 0 10px 0", fontSize: "16px" }}>Docking Demo</h3>
                <p style={{ margin: "0 0 10px 0", fontSize: "12px", color: "#666" }}>
                  Toggle windows and test docking behavior:
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {[
                    { id: "window-1", label: "Window 1 (Right)" },
                    { id: "window-2", label: "Window 2 (Bottom)" },
                    { id: "window-3", label: "Window 3 (Left)" },
                    { id: "window-4", label: "Window 4 (Top)" },
                    { id: "window-5", label: "Window 5 (Free)" },
                    { id: "window-6", label: "Window 6 (Starts docked left)" },
                    { id: "window-7", label: "Window 7 (Locked to bottom)" },
                  ].map(({ id, label }) => (
                    <label
                      key={id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={visibleWindows[id] ?? false}
                        onChange={() => toggleWindow(id)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <div style={{ marginTop: "12px", fontSize: "11px", color: "#999" }}>
                  💡 Drag windows near screen edges to snap-dock
                </div>
              </div>

              {/* Windows container */}
              <div style={{ position: "relative", width: "100%", height: "100%" }}>
                {/* Window 1: Dockable to Right */}
                <ContextWindow
                  ref={(ref) => {
                    if (ref) windowRefs.current["window-1"] = ref;
                  }}
                  id="window-1"
                  visible={visibleWindows["window-1"] ?? false}
                  title="Window 1 - Right Docked"
                  dockable={true}
                  onClose={() => toggleWindow("window-1")}
                  style={{ width: "350px", minHeight: "200px" }}
                >
                  {dummyContent("Window 1 - Try dragging to right edge")}
                  <button
                    onClick={() => handleDockWindow("window-1", "right")}
                    style={{
                      padding: "8px 12px",
                      margin: "10px",
                      fontSize: "12px",
                      cursor: "pointer",
                      backgroundColor: "#007bff",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                    }}
                  >
                    Dock to Right (Vertical)
                  </button>
                </ContextWindow>

                {/* Window 2: Dockable to Bottom */}
                <ContextWindow
                  ref={(ref) => {
                    if (ref) windowRefs.current["window-2"] = ref;
                  }}
                  id="window-2"
                  visible={visibleWindows["window-2"] ?? false}
                  title="Window 2 - Bottom Docked"
                  dockable={true}
                  onClose={() => toggleWindow("window-2")}
                  style={{ width: "350px", minHeight: "200px" }}
                >
                  {dummyContent("Window 2 - Try dragging to bottom edge")}
                  <button
                    onClick={() => handleDockWindow("window-2", "bottom")}
                    style={{
                      padding: "8px 12px",
                      margin: "10px",
                      fontSize: "12px",
                      cursor: "pointer",
                      backgroundColor: "#28a745",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                    }}
                  >
                    Dock to Bottom (Horizontal)
                  </button>
                </ContextWindow>

                {/* Window 3: Dockable to Left */}
                <ContextWindow
                  ref={(ref) => {
                    if (ref) windowRefs.current["window-3"] = ref;
                  }}
                  id="window-3"
                  visible={visibleWindows["window-3"] ?? false}
                  title="Window 3 - Left Docked"
                  dockable={true}
                  onClose={() => toggleWindow("window-3")}
                  style={{ width: "350px", minHeight: "200px" }}
                >
                  {dummyContent("Window 3 - Try dragging to left edge")}
                  <button
                    onClick={() => handleDockWindow("window-3", "left")}
                    style={{
                      padding: "8px 12px",
                      margin: "10px",
                      fontSize: "12px",
                      cursor: "pointer",
                      backgroundColor: "#dc3545",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                    }}
                  >
                    Dock to Left (Vertical)
                  </button>
                </ContextWindow>

                {/* Window 4: Dockable to Top */}
                <ContextWindow
                  ref={(ref) => {
                    if (ref) windowRefs.current["window-4"] = ref;
                  }}
                  id="window-4"
                  visible={visibleWindows["window-4"] ?? false}
                  title="Window 4 - Top Docked"
                  dockable={true}
                  onClose={() => toggleWindow("window-4")}
                  style={{ width: "350px", minHeight: "200px" }}
                >
                  {dummyContent("Window 4 - Try dragging to top edge")}
                  <button
                    onClick={() => handleDockWindow("window-4", "top")}
                    style={{
                      padding: "8px 12px",
                      margin: "10px",
                      fontSize: "12px",
                      cursor: "pointer",
                      backgroundColor: "#ffc107",
                      color: "black",
                      border: "none",
                      borderRadius: "4px",
                    }}
                  >
                    Dock to Top (Horizontal)
                  </button>
                </ContextWindow>

                {/* Window 5: Non-Dockable Window */}
                <ContextWindow
                  id="window-5"
                  visible={visibleWindows["window-5"] ?? false}
                  title="Window 5 - Non-Dockable"
                  dockable={false}
                  onClose={() => toggleWindow("window-5")}
                  style={{ width: "350px", minHeight: "200px" }}
                >
                  <div style={{ padding: "15px" }}>
                    <h3 style={{ margin: "0 0 10px 0", fontSize: "14px" }}>
                      Window 5 - Non-Dockable
                    </h3>
                    <p style={{ margin: "0", fontSize: "12px", color: "#666" }}>
                      This window is not dockable. Notice there&apos;s no dock button in the title
                      bar. You can still drag it around normally.
                    </p>
                  </div>
                </ContextWindow>

                {/* Window 6: Opens docked to the left, can be undocked */}
                <ContextWindow
                  id="window-6"
                  visible={visibleWindows["window-6"] ?? false}
                  title="Window 6 - Starts Docked"
                  dockable={true}
                  initialDockEdge="left"
                  onClose={() => toggleWindow("window-6")}
                  style={{ width: "350px", minHeight: "200px" }}
                >
                  <div style={{ padding: "15px", fontSize: "12px", color: "#666" }}>
                    <h3 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#000" }}>
                      Window 6 - Starts Docked
                    </h3>
                    This window opens inside the left DockPanel. Undock it with the title bar button
                    or by dragging it away from the edge.
                  </div>
                </ContextWindow>

                {/* Window 7: Opens docked to the bottom and cannot be undocked */}
                <ContextWindow
                  id="window-7"
                  visible={visibleWindows["window-7"] ?? false}
                  title="Window 7 - Locked"
                  dockable={true}
                  initialDockEdge="bottom"
                  allowUndock={false}
                  onClose={() => toggleWindow("window-7")}
                  style={{ width: "350px", minHeight: "200px" }}
                >
                  <div style={{ padding: "15px", fontSize: "12px", color: "#666" }}>
                    <h3 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#000" }}>
                      Window 7 - Locked
                    </h3>
                    This window opens in the bottom DockPanel and cannot be undocked: there is no
                    undock button and dragging it does not pull it out of the panel.
                  </div>
                </ContextWindow>

                {/* Instructions */}
                <div
                  style={{
                    position: "absolute",
                    bottom: "10px",
                    left: "10px",
                    backgroundColor: "white",
                    border: "1px solid #ccc",
                    borderRadius: "8px",
                    padding: "15px",
                    maxWidth: "350px",
                    fontSize: "12px",
                    color: "#333",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  }}
                >
                  <h4 style={{ margin: "0 0 8px 0", fontSize: "14px" }}>Instructions:</h4>
                  <ul style={{ margin: "0", paddingLeft: "18px" }}>
                    <li>Drag windows within 24px of edges to see snap indicator</li>
                    <li>Release to dock, or drag away to cancel</li>
                    <li>Click dock button in title bar for quick docking</li>
                    <li>Click undock button (or drag away) to undock</li>
                    <li>Click window tab to toggle collapse/expand</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </DockingProvider>
      );
    };

    return <DockingKitchenSink />;
  },
};

export const SingleDockableWindow: Story = {
  render: () => {
    const [visible, setVisible] = useState(true);
    const windowRef = useRef<ContextWindowHandle>(null);

    return (
      <DockingProvider>
        <div
          style={{
            ...dockingViewportSize,
            backgroundColor: "#f5f5f5",
            display: "grid",
            gridTemplateColumns: "160px 1fr 160px",
            gridTemplateRows: "48px 1fr 48px",
            gap: 0,
            overflow: "hidden",
          }}
        >
          {/* Center Content Area */}
          <div
            style={{
              gridColumn: 2,
              gridRow: 2,
              position: "relative",
              overflow: "auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ContextWindow
              ref={windowRef}
              id="single-window"
              visible={visible}
              title="Single Dockable Window"
              dockable={true}
              onClose={() => setVisible(false)}
              style={{ width: "400px", minHeight: "250px" }}
            >
              <div style={{ padding: "20px" }}>
                <h2 style={{ margin: "0 0 15px 0" }}>Single Dockable Window</h2>
                <p>Try dragging this window near any screen edge (within 24px).</p>
                <p>You&apos;ll see a blue highlight indicating where it will dock.</p>
                <button
                  onClick={() => windowRef.current?.dock("right")}
                  style={{
                    padding: "10px 15px",
                    marginRight: "10px",
                    cursor: "pointer",
                    backgroundColor: "#007bff",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    fontSize: "14px",
                  }}
                >
                  Dock to Right
                </button>
                <button
                  onClick={() => windowRef.current?.undock()}
                  style={{
                    padding: "10px 15px",
                    cursor: "pointer",
                    backgroundColor: "#6c757d",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    fontSize: "14px",
                  }}
                >
                  Undock
                </button>
              </div>
            </ContextWindow>
          </div>
        </div>
      </DockingProvider>
    );
  },
};

export const MultipleDockedWindows: Story = {
  render: () => {
    const [visibleWindows, setVisibleWindows] = useState({
      w1: true,
      w2: true,
      w3: true,
      w4: true,
    });

    const toggleWindow = (id: string) => {
      setVisibleWindows((prev) => ({
        ...prev,
        [id]: !prev[id as keyof typeof prev],
      }));
    };

    return (
      <DockingProvider>
        <div
          style={{
            ...dockingViewportSize,
            backgroundColor: "#f5f5f5",
            display: "grid",
            gridTemplateColumns: "160px 1fr 160px",
            gridTemplateRows: "auto 48px 1fr 48px",
            gap: 0,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              gridColumn: "1 / 4",
              gridRow: 1,
              padding: "20px",
              backgroundColor: "white",
              borderBottom: "1px solid #ddd",
            }}
          >
            <h2 style={{ margin: "0 0 15px 0" }}>Multiple Docked Windows</h2>
            <div style={{ display: "flex", gap: "15px", fontSize: "14px" }}>
              {[
                { id: "w1", label: "Window 1" },
                { id: "w2", label: "Window 2" },
                { id: "w3", label: "Window 3" },
              ].map(({ id, label }) => (
                <label
                  key={id}
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <input
                    type="checkbox"
                    checked={visibleWindows[id as keyof typeof visibleWindows] ?? false}
                    onChange={() => toggleWindow(id)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Center Content Area */}
          <div
            style={{
              gridColumn: 2,
              gridRow: 3,
              position: "relative",
              overflow: "auto",
              padding: "20px",
            }}
          >
            {visibleWindows.w1 && (
              <ContextWindow
                id="w1"
                visible={true}
                title="Window 1 (Right)"
                dockable={true}
                onClose={() => toggleWindow("w1")}
                style={{ width: "300px", minHeight: "150px" }}
              >
                <div style={{ padding: "10px", fontSize: "12px" }}>Window 1 Content</div>
              </ContextWindow>
            )}

            {visibleWindows.w2 && (
              <ContextWindow
                id="w2"
                visible={true}
                title="Window 2 (Bottom)"
                dockable={true}
                onClose={() => toggleWindow("w2")}
                style={{ width: "300px", minHeight: "150px" }}
              >
                <div style={{ padding: "10px", fontSize: "12px" }}>Window 2 Content</div>
              </ContextWindow>
            )}

            {visibleWindows.w3 && (
              <ContextWindow
                id="w3"
                visible={true}
                title="Window 3 (Left)"
                dockable={true}
                onClose={() => toggleWindow("w3")}
                style={{ width: "300px", minHeight: "150px" }}
              >
                <div style={{ padding: "10px", fontSize: "12px" }}>Window 3 Content</div>
              </ContextWindow>
            )}

            {visibleWindows.w4 && (
              <ContextWindow
                id="w4"
                visible={true}
                title="Window 4 (Top)"
                dockable={true}
                style={{ width: "300px", minHeight: "150px" }}
              >
                <div style={{ padding: "10px", fontSize: "12px" }}>Window 4 Content</div>
              </ContextWindow>
            )}
          </div>
        </div>
      </DockingProvider>
    );
  },
};

const DockLayout = ({ children }: { children: ReactNode }) => (
  <DockingProvider>
    <div
      style={{
        ...dockingViewportSize,
        backgroundColor: "#f5f5f5",
        display: "grid",
        gridTemplateColumns: "160px 1fr 160px",
        gridTemplateRows: "48px 1fr 48px",
        gap: 0,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          gridColumn: 2,
          gridRow: 2,
          position: "relative",
          overflow: "auto",
          padding: "20px",
        }}
      >
        {children}
      </div>
    </div>
  </DockingProvider>
);

export const InitiallyDockedWindow: Story = {
  render: () => {
    const [visible, setVisible] = useState(true);

    return (
      <DockLayout>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}>
          <input
            type="checkbox"
            checked={visible}
            onChange={() => setVisible((v) => !v)}
          />
          Show window (re-opens docked to the right)
        </label>
        <ContextWindow
          id="initially-docked"
          visible={visible}
          title="Initially Docked Window"
          dockable={true}
          initialDockEdge="right"
          onClose={() => setVisible(false)}
          style={{ width: "350px", minHeight: "200px" }}
        >
          <div style={{ padding: "15px", fontSize: "12px" }}>
            This window opens inside the right DockPanel via{" "}
            <code>initialDockEdge=&quot;right&quot;</code>. Undock it with the title bar button or
            by dragging it away from the edge.
          </div>
        </ContextWindow>
      </DockLayout>
    );
  },
};

export const LockedDockedWindow: Story = {
  render: () => {
    const [visible, setVisible] = useState(true);
    const windowRef = useRef<ContextWindowHandle>(null);
    const edges: DockEdge[] = ["top", "right", "bottom", "left"];

    return (
      <DockLayout>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}>
          <input
            type="checkbox"
            checked={visible}
            onChange={() => setVisible((v) => !v)}
          />
          Show window
        </label>
        <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
          {edges.map((edge) => (
            <button
              key={edge}
              onClick={() => windowRef.current?.dock(edge)}
            >
              Move to {edge}
            </button>
          ))}
          <button onClick={() => windowRef.current?.undock()}>Try ref.undock()</button>
        </div>
        <ContextWindow
          ref={windowRef}
          id="locked-docked"
          visible={visible}
          title="Locked Docked Window"
          dockable={true}
          initialDockEdge="left"
          allowUndock={false}
          onClose={() => setVisible(false)}
          style={{ width: "350px", minHeight: "200px" }}
        >
          <div style={{ padding: "15px", fontSize: "12px" }}>
            This window uses <code>allowUndock=&#123;false&#125;</code>. It has no undock button,
            dragging does not pull it out of the panel and <code>ref.undock()</code> does nothing.
            It can still be moved to another edge with <code>ref.dock()</code>, pinned, or closed.
          </div>
        </ContextWindow>
      </DockLayout>
    );
  },
};
