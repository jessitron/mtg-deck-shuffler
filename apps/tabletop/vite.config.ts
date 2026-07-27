/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The client build. Server code is compiled separately (tsconfig.server.json)
// and serves dist/client as static files with an SPA fallback for /t/*.
export default defineConfig({
  plugins: [react()],
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
