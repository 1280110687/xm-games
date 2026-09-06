import js from "@eslint/js"
import globals from "globals"

// These are browser applications, not Next.js pages. Keep real JS correctness
// checks without imposing DOM-only React rules on Three Fiber scene elements.
const config = [
  { ignores: ["**/dist/**", "**/node_modules/**"] },
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: globals.browser,
    },
    rules: {
      ...js.configs.recommended.rules,
      // Imported JSX names and shader API arguments are intentionally retained.
      "no-unused-vars": "off",
    },
  },
]

export default config
