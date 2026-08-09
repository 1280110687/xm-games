import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import compression from "vite-plugin-compression"

export default defineConfig({
  base: "/theme-four-experience/",
  publicDir: false,
  plugins: [react(), compression()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
})
