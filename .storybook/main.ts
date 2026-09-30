import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../stories/**/*.stories.tsx"],
  addons: [],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  features: {
    sidebarOnboardingChecklist: false,
    menuOnboardingChecklist: false,
  },
};
export default config;
