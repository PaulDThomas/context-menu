import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/vitest.setup.ts", "./src/setupTests.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    css: {
      modules: {
        classNameStrategy: "non-scoped",
      },
    },
    coverage: {
      provider: "v8",
      all: true,
      include: ["src/**/*.{js,jsx,ts,tsx}"],
      exclude: [
        "**/*.test.{js,jsx,ts,tsx}",
        "**/*.spec.{js,jsx,ts,tsx}",
        "**/index.ts",
        "**/interface.ts",
        "**/main.ts",
        "**/__dummy__/**",
        "**/__mocks__/**",
        "**/*.stories.{ts,tsx}",
      ],
      reporter: ["text", "html", "lcov"],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
