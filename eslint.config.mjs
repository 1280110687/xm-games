import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTypeScript from "eslint-config-next/typescript"

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    rules: {
      // Browser storage/API hydration and game initialization intentionally
      // transition local state from effects; other Hooks rules stay enabled.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  globalIgnores([
    ".next/**",
    ".open-next/**",
    ".playwright-cli/**",
    "output/**",
    ".design-qa-evidence/**",
    "out/**",
    "build/**",
    "public/theme-four-experience/**",
    "apps/theme-four-world/**",
    "apps/elemental-arena/**",
    "next-env.d.ts",
  ]),
])
