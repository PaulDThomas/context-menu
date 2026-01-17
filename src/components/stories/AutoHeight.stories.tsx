import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { AutoHeight } from "../AutoHeight";

const meta = {
  title: "Components/AutoHeight",
  component: AutoHeight,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof AutoHeight>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  args: {
    children: (
      <div style={{ padding: "12px", backgroundColor: "lightgrey" }}>
        This content can change size; AutoHeight will help the layout adjust smoothly.
      </div>
    ),
    style: { width: "300px" },
  },
};

export const WithHideToggle: Story = {
  args: {
    children: <></>,
  },
  render: () => {
    const AutoHeightWithHide = () => {
      const [hide, setHide] = useState(false);
      return (
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "12px" }}>
          <button
            onClick={() => setHide(!hide)}
            style={{ marginBottom: "10px" }}
          >
            {hide ? "Show content" : "Hide content"}
          </button>
          <div style={{ width: "300px" }}>
            <AutoHeight
              hide={hide}
              style={{ backgroundColor: "lightgrey" }}
            >
              <div style={{ padding: "12px" }}>This content will animate when hidden or shown</div>
            </AutoHeight>
          </div>
        </div>
      );
    };
    return <AutoHeightWithHide />;
  },
};

export const DynamicHeight: Story = {
  args: {
    children: <></>,
  },
  render: () => {
    const AutoHeightDynamic = () => {
      const [height, setHeight] = useState<number | null>(null);
      return (
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "12px" }}>
          <select
            style={{ marginBottom: "0" }}
            value={`${height}`}
            onChange={(e) => setHeight(e.target.value ? parseInt(e.target.value) : null)}
          >
            <option value="">Auto height</option>
            <option value="100">100px</option>
            <option value="200">200px</option>
            <option value="300">300px</option>
          </select>
          <div style={{ width: "300px" }}>
            <AutoHeight style={{ backgroundColor: "lightgrey" }}>
              <div
                style={{
                  padding: "12px",
                  height: height ? `${height}px` : "auto",
                  transition: "height 0.3s ease",
                }}
              >
                Resize to {height ? `${height}px` : "auto"}
              </div>
            </AutoHeight>
          </div>
        </div>
      );
    };
    return <AutoHeightDynamic />;
  },
};

export const ContentSwitching: Story = {
  args: {
    children: <></>,
  },
  render: () => {
    const AutoHeightSwitch = () => {
      const [thing, setThing] = useState<string>("Thing1");
      return (
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "12px" }}>
          <select
            style={{ marginBottom: "0" }}
            value={thing}
            onChange={(e) => setThing(e.target.value)}
          >
            <option>Thing1</option>
            <option>Thing2</option>
            <option>Nowt</option>
          </select>
          <div style={{ width: "300px" }}>
            <AutoHeight
              hide={thing === "Thing2"}
              duration={500}
              style={{ backgroundColor: "lightgrey" }}
            >
              {thing === "Thing1" ? (
                <div style={{ padding: "12px" }}>Thing 1 content - shorter</div>
              ) : thing === "Thing2" ? (
                <>Content is hidden when Thing2 is selected</>
              ) : (
                <div style={{ padding: "12px" }}>
                  <p>Nothing to see here</p>
                  <p>This is a longer paragraph to demonstrate height changes</p>
                  <p>The AutoHeight component will smoothly animate</p>
                </div>
              )}
            </AutoHeight>
          </div>
        </div>
      );
    };
    return <AutoHeightSwitch />;
  },
};

export const CustomDuration: Story = {
  args: {
    children: <></>,
  },
  render: () => {
    const AutoHeightWithCustomDuration = () => {
      const [hide, setHide] = useState(false);
      return (
        <div style={{ display: "flex", flexDirection: "row", gap: "12px", alignItems: "center" }}>
          <button
            onClick={() => setHide(!hide)}
            style={{ marginBottom: "10px" }}
          >
            {hide ? "Show content" : "Hide content"}
          </button>
          <div style={{ width: "300px" }}>
            <AutoHeight
              hide={hide}
              duration={1000}
              style={{ backgroundColor: "lightgrey" }}
            >
              <div style={{ padding: "12px" }}>This has a slower transition (1000ms)</div>
            </AutoHeight>
          </div>
        </div>
      );
    };
    return <AutoHeightWithCustomDuration />;
  },
};
