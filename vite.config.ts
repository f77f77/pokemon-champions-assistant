import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

/** GitHub Pages project site base */
const PAGES_BASE = "/pokemon-champions-assistant/";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  base: PAGES_BASE,
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
