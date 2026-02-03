import type { Meta, StoryObj } from "@storybook/react-vite";
import { useRef, useState } from "react";
import { fn } from "storybook/test";
import { ContextWindow, ContextWindowHandle } from "../ContextWindow";

const meta = {
  title: "Components/ContextWindow",
  component: ContextWindow,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ContextWindow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  args: {
    id: "window-basic",
    visible: true,
    title: "Basic Window",
    onClose: fn(),
    children: <div style={{ padding: "10px" }}>Window content goes here</div>,
  },
};

export const WithLongTitle: Story = {
  args: {
    id: "window-long-title",
    visible: true,
    title: "Window with a very very very long title, that wants to be squashed",
    onClose: fn(),
    children: <div style={{ padding: "10px" }}>The title is truncated when too long</div>,
  },
};

export const CustomSize: Story = {
  args: {
    id: "window-custom-size",
    visible: true,
    title: "Custom Size Window",
    onClose: fn(),
    style: { width: "400px", minHeight: "200px" },
    children: <div style={{ padding: "10px" }}>This window has a custom width of 400px</div>,
  },
};

export const MultipleWindows: Story = {
  args: {
    id: "",
    visible: false,
    title: "",
    children: <></>,
  },
  render: () => {
    const MultiWindowDemo = () => {
      const [showWindow, setShowWindow] = useState<boolean[]>([false, false, false]);

      const toggleWindow = (index: number) => {
        setShowWindow(showWindow.map((b, ix) => (ix === index ? !b : b)));
      };

      return (
        <div style={{ padding: "20px" }}>
          <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
            {[0, 1, 2].map((i) => (
              <label
                key={i}
                style={{ display: "flex", alignItems: "center", gap: "5px" }}
              >
                <input
                  type="checkbox"
                  checked={showWindow[i]}
                  onChange={() => toggleWindow(i)}
                />
                Show window {i + 1}
              </label>
            ))}
          </div>
          <div>Visible windows: {JSON.stringify(showWindow)}</div>
          {[0, 1, 2].map((i) => (
            <ContextWindow
              key={i}
              id={`w-${i}`}
              visible={showWindow[i]}
              title={`Window ${i + 1}`}
              onClose={() => {
                setShowWindow(showWindow.map((b, ix) => (ix === i ? false : b)));
              }}
              style={{ width: `${(i + 1) * 150}px` }}
            >
              <div style={{ padding: "10px" }}>Content for window {i + 1}</div>
            </ContextWindow>
          ))}
        </div>
      );
    };
    return <MultiWindowDemo />;
  },
};

export const ControlledVisibility: Story = {
  args: {
    id: "",
    visible: false,
    title: "",
    children: <></>,
  },
  render: () => {
    const ControlledDemo = () => {
      const [visible, setVisible] = useState(false);
      return (
        <div style={{ padding: "20px" }}>
          <button onClick={() => setVisible(true)}>Open Window</button>
          <ContextWindow
            id="controlled-window"
            visible={visible}
            title="Controlled Window"
            onClose={() => setVisible(false)}
            onOpen={() => console.log("Window opened")}
          >
            <div style={{ padding: "10px" }}>
              <p>This window&apos;s visibility is controlled by state.</p>
              <p>Click the X to close it.</p>
            </div>
          </ContextWindow>
        </div>
      );
    };
    return <ControlledDemo />;
  },
};

export const Draggable: Story = {
  args: {
    id: "window-draggable",
    visible: true,
    title: "Draggable Window",
    onClose: fn(),
    children: (
      <div style={{ padding: "10px" }}>
        <p>Drag the title bar to move this window.</p>
        <p>The window will stay within the viewport bounds.</p>
      </div>
    ),
  },
};

export const PushToTopFromExternal: Story = {
  args: {
    id: "",
    visible: false,
    title: "",
    children: <></>,
  },
  render: () => {
    const PushToTopDemo = () => {
      const windowRef1 = useRef<ContextWindowHandle>(null);
      const windowRef2 = useRef<ContextWindowHandle>(null);
      const windowRef3 = useRef<ContextWindowHandle>(null);
      const [showWindow, setShowWindow] = useState<boolean[]>([true, true, true]);

      const toggleWindow = (index: number) => {
        setShowWindow(showWindow.map((b, ix) => (ix === index ? !b : b)));
      };

      const handlePushToTop = (windowRef: React.RefObject<ContextWindowHandle | null>) => {
        windowRef.current?.pushToTop();
      };

      return (
        <div style={{ padding: "20px" }}>
          <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{ display: "flex", gap: "5px" }}
              >
                <label style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <input
                    type="checkbox"
                    checked={showWindow[i]}
                    onChange={() => toggleWindow(i)}
                  />
                  Show window {i + 1}
                </label>
                <button
                  onClick={() =>
                    handlePushToTop(i === 0 ? windowRef1 : i === 1 ? windowRef2 : windowRef3)
                  }
                  style={{
                    padding: "5px 10px",
                    backgroundColor: "#007bff",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Push to Top
                </button>
              </div>
            ))}
          </div>
          <div style={{ marginBottom: "10px", fontWeight: "bold" }}>
            Visible windows: {JSON.stringify(showWindow)}
          </div>
          <ContextWindow
            ref={windowRef1}
            id="w-pushToTop-1"
            visible={showWindow[0]}
            title="Window 1"
            onClose={() => {
              setShowWindow(showWindow.map((b, ix) => (ix === 0 ? false : b)));
            }}
            style={{ width: "300px" }}
          >
            <div style={{ padding: "10px" }}>
              <p>This is window 1.</p>
              <p>Click the &quot;Push to Top&quot; button to bring it to the foreground.</p>
            </div>
          </ContextWindow>
          <ContextWindow
            ref={windowRef2}
            id="w-pushToTop-2"
            visible={showWindow[1]}
            title="Window 2"
            onClose={() => {
              setShowWindow(showWindow.map((b, ix) => (ix === 1 ? false : b)));
            }}
            style={{ width: "300px" }}
          >
            <div style={{ padding: "10px" }}>
              <p>This is window 2.</p>
              <p>Click the &quot;Push to Top&quot; button to bring it to the foreground.</p>
            </div>
          </ContextWindow>
          <ContextWindow
            ref={windowRef3}
            id="w-pushToTop-3"
            visible={showWindow[2]}
            title="Window 3"
            onClose={() => {
              setShowWindow(showWindow.map((b, ix) => (ix === 2 ? false : b)));
            }}
            style={{ width: "300px" }}
          >
            <div style={{ padding: "10px" }}>
              <p>This is window 3.</p>
              <p>Click the &quot;Push to Top&quot; button to bring it to the foreground.</p>
            </div>
          </ContextWindow>
        </div>
      );
    };
    return <PushToTopDemo />;
  },
};
