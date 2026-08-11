/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    "import.meta.env.VITE_TLDRAW_LICENSE_KEY": JSON.stringify(
      process.env.TLDRAW_LICENSE_KEY ?? process.env.VITE_TLDRAW_LICENSE_KEY ?? ""
    ),
  },
  build: {
    outDir: "dist/client",
    emptyOutDir: true,
  },
  server: {
    port: Number(process.env.PORT ?? 5180),
  },
  test: {
    // Playwright specs live in test/verification (run by verify.sh), not vitest
    exclude: ["**/node_modules/**", "**/dist/**", "test/verification/**"],
  },
});
