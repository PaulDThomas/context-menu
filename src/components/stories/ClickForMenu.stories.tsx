import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ClickForMenu } from "../ClickForMenu";
import { IMenuItem } from "../interface";

const meta = {
  title: "Components/ClickForMenu",
  component: ClickForMenu,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ClickForMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

const basicMenuItems: IMenuItem[] = [
  { label: "Edit", action: fn() },
  { label: "Delete", action: fn() },
];

export const Basic: Story = {
  args: {
    id: "click-menu-basic",
    menuItems: basicMenuItems,
    children: (
      <button
        type="button"
        style={{ padding: "10px 20px", cursor: "pointer" }}
      >
        Click for Menu
      </button>
    ),
  },
};

const extendedMenuItems: IMenuItem[] = [
  { label: "Click For Menu action 1", action: fn() },
  { label: "Click For Menu action 2", action: fn() },
  { label: "Click For Menu action 3", action: fn() },
  { label: "Click For Menu action 4", action: fn() },
];

export const MultipleActions: Story = {
  args: {
    id: "click-menu-multiple",
    menuItems: extendedMenuItems,
    children: (
      <button
        type="button"
        style={{ padding: "10px 20px", cursor: "pointer" }}
      >
        Click for Multiple Actions
      </button>
    ),
  },
};

export const InlineText: Story = {
  args: {
    id: "click-menu-inline",
    menuItems: basicMenuItems,
    children: (
      <span style={{ textDecoration: "underline", cursor: "pointer" }}>Click this text</span>
    ),
  },
};

export const WithoutMenuItems: Story = {
  args: {
    id: "click-menu-no-items",
    menuItems: undefined,
    onClick: fn(),
    children: (
      <button
        type="button"
        style={{ padding: "10px 20px", cursor: "pointer" }}
      >
        Normal click (no menu)
      </button>
    ),
  },
};
