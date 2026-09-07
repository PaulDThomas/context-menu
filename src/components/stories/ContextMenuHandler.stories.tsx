import type { Meta, StoryObj } from "@storybook/react-vite";
import React from "react";
import { fn } from "storybook/test";
import { ContextMenuHandler } from "../ContextMenuHandler";
import { IMenuItem } from "../interface";

const meta = {
  title: "Components/ContextMenuHandler",
  component: ContextMenuHandler,
  parameters: {
    layout: "centered",
    docs: {
      story: {
        inline: false,
        iframeHeight: 200,
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ContextMenuHandler>;

export default meta;
type Story = StoryObj<typeof meta>;

const basicMenuItems: IMenuItem[] = [
  { label: "Item 1", action: fn() },
  { label: "Item 2", action: fn() },
  { label: "Item 3 (disabled)", disabled: true },
];

export const Basic: Story = {
  args: {
    menuItems: basicMenuItems,
    children: (
      <div
        style={{
          padding: "40px",
          backgroundColor: "lightblue",
          textAlign: "center",
          cursor: "context-menu",
        }}
      >
        Right click here to open the menu
      </div>
    ),
  },
};

const nestedMenuItems: IMenuItem[] = [
  {
    label: "Red colors",
    action: fn(),
    group: [
      { label: "Light coral", action: fn() },
      { label: "Pink", action: fn() },
      { label: "Russet (disabled)", disabled: true },
    ],
  },
  { label: "Green", action: fn() },
  {
    label: "Blue colors",
    action: fn(),
    group: [
      { label: "Light blue", action: fn() },
      { label: "Cyan", action: fn() },
      { label: "Dark blue", action: fn() },
    ],
  },
  { label: "Yellow", action: fn() },
];

export const WithNestedSubmenus: Story = {
  args: {
    menuItems: nestedMenuItems,
    children: (
      <div
        style={{
          padding: "40px",
          backgroundColor: "lightgreen",
          textAlign: "center",
          cursor: "context-menu",
        }}
      >
        Right click for nested menu
      </div>
    ),
  },
};

const menuWithDivider: IMenuItem[] = [
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
];

export const WithDivider: Story = {
  args: {
    menuItems: menuWithDivider,
    style: { width: "100%", backgroundColor: "magenta" },
    children: (
      <>
        <span style={{ backgroundColor: "white" }}>Hello</span>
        <span style={{ backgroundColor: "green" }}> Green </span>
        <span style={{ backgroundColor: "lightblue" }}>Grass</span>
      </>
    ),
  },
};

export const WithLowMenu: Story = {
  args: {
    menuItems: basicMenuItems,
    showLowMenu: true,
    style: { width: "100%", backgroundColor: "magenta" },
    children: (
      <div
        contentEditable
        suppressContentEditableWarning
        style={{ padding: "10px" }}
      >
        Hover to see the low menu. There is something to select here.
      </div>
    ),
  },
};

export const NestedHandlers: Story = {
  args: {
    children: <></>,
    menuItems: [],
  },
  render: () => (
    <ContextMenuHandler
      menuItems={[{ label: "Outer item", action: fn() }]}
      style={{ backgroundColor: "lightblue", padding: "20px" }}
    >
      <div style={{ marginBottom: "10px" }}>Outer handler area (right click)</div>
      <ContextMenuHandler
        menuItems={[{ label: "Inner item", action: fn() }]}
        style={{ backgroundColor: "lightgreen", padding: "20px" }}
      >
        <div>Inner handler area (right click - shows both menus)</div>
      </ContextMenuHandler>
    </ContextMenuHandler>
  ),
};

const selectedMenuItems: IMenuItem[] = [
  { label: "Option A", action: fn(), selected: true },
  { label: "Option B", action: fn(), selected: false },
  { label: "Option C (custom icon)", action: fn(), selected: true, selectedIcon: "★" },
  { label: "Option D (disabled)", disabled: true, selected: true },
];

export const WithSelected: Story = {
  args: {
    menuItems: selectedMenuItems,
    children: (
      <div
        style={{
          padding: "40px",
          backgroundColor: "lightyellow",
          textAlign: "center",
          cursor: "context-menu",
        }}
      >
        Right click to see menu with selected items
      </div>
    ),
  },
  render: () => {
    const [selected, setSelected] = React.useState<Record<string, boolean>>({
      A: true,
      B: false,
      C: true,
      D: true,
    });
    const items: IMenuItem[] = [
      {
        label: "Option A",
        selected: selected.A,
        action: () => setSelected((s) => ({ ...s, A: !s.A })),
      },
      {
        label: "Option B",
        selected: selected.B,
        action: () => setSelected((s) => ({ ...s, B: !s.B })),
      },
      {
        label: "Option C (custom icon)",
        selected: selected.C,
        selectedIcon: "★",
        action: () => setSelected((s) => ({ ...s, C: !s.C })),
      },
      {
        label: "Option D (disabled)",
        disabled: true,
        selected: selected.D,
      },
    ];
    return (
      <ContextMenuHandler menuItems={items}>
        <div
          style={{
            padding: "40px",
            backgroundColor: "lightyellow",
            textAlign: "center",
            cursor: "context-menu",
          }}
        >
          Right click to see menu with selected items (click an item to toggle its selection)
        </div>
      </ContextMenuHandler>
    );
  },
};

export const WithSelectedLowMenu: Story = {
  args: {
    menuItems: selectedMenuItems,
    showLowMenu: true,
    style: { width: "100%", backgroundColor: "lightyellow" },
    children: <div style={{ padding: "10px" }}>Hover to see the low menu with selected items</div>,
  },
  render: () => {
    const [selected, setSelected] = React.useState<Record<string, boolean>>({
      A: true,
      B: false,
      C: true,
      D: true,
    });
    const items: IMenuItem[] = [
      {
        label: "Option A",
        selected: selected.A,
        action: () => setSelected((s) => ({ ...s, A: !s.A })),
      },
      {
        label: "Option B",
        selected: selected.B,
        action: () => setSelected((s) => ({ ...s, B: !s.B })),
      },
      {
        label: "Option C (custom icon)",
        selected: selected.C,
        selectedIcon: "★",
        action: () => setSelected((s) => ({ ...s, C: !s.C })),
      },
      {
        label: "Option D (disabled)",
        disabled: true,
        selected: selected.D,
      },
    ];
    return (
      <ContextMenuHandler
        menuItems={items}
        showLowMenu
        style={{ width: "100%", backgroundColor: "lightyellow" }}
      >
        <div style={{ padding: "10px" }}>
          Hover to see the low menu with selected items (click an item to toggle its selection)
        </div>
      </ContextMenuHandler>
    );
  },
};
