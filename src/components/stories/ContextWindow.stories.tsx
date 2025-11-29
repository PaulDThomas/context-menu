import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import { ContextWindow } from "../ContextWindow";

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
