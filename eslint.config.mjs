import { fixupConfigRules, fixupPluginRules } from "@eslint/compat";
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import jest from "eslint-plugin-jest";
import eslintPluginPrettierRecommented from "eslint-plugin-prettier/recommended";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import unusedImports from "eslint-plugin-unused-imports";
import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  {
    ignores: ["**/build/**/*", "**/coverage/**/*", "**/dist/**/*"],
  },
  ...fixupConfigRules(
    compat.extends(
      "eslint:recommended",
      "plugin:react/recommended",
      "plugin:react-hooks/recommended",
      "plugin:@typescript-eslint/recommended",
      "plugin:jest/recommended",
    ),
  ),
  {
    plugins: {
      react: fixupPluginRules(react),
      "@typescript-eslint": fixupPluginRules(typescriptEslint),
      "react-hooks": fixupPluginRules(reactHooks),
      jest: fixupPluginRules(jest),
      "unused-imports": unusedImports,
    },

    languageOptions: {
      globals: {
        ...Object.fromEntries(Object.entries(globals.node).map(([key]) => [key, "off"])),
        ...globals.browser,
        ...globals.jest,
        ...globals.worker,
        ...jest.environments.globals.globals,
      },

      parser: tsParser,
      ecmaVersion: 12,
      sourceType: "module",

      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },

    settings: {
      "import/resolver": {
        typescript: {},
      },

      react: {
        version: "detect",
      },
    },

    rules: {
      quotes: ["warn", "double"],
      "no-duplicate-imports": "error",
      "default-param-last": 1,
      "prefer-const": 1,
      "spaced-comment": "error",
      "@typescript-eslint/no-unused-expressions": "warn",
      "jest/no-identical-title": "error",
      "jest/no-mocks-import": "off",
      "react/react-in-jsx-scope": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
      eqeqeq: 1,
      "@typescript-eslint/no-unused-vars": "off",
      "no-unused-vars": "off",
      "unused-imports/no-unused-imports": "warn",
      "prettier/prettier": "warn",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
    },
  },
  eslintPluginPrettierRecommented,
];
