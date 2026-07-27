/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The client build. Server code is compiled separately (tsconfig.server.json)
// and serves dist/client as static files with an SPA fallback for /t/*.
export default defineConfig({
  plugins: [react()],
  // The tldraw license key is read from the shell as TLDRAW_LICENSE_KEY (that's
  // the name tldraw's own docs use, and the name in .be) and baked into the
  // bundle. Defining it explicitly, rather than relying on Vite's VITE_ prefix
  // convention, means one name in the shell and no silent miss when someone
  // forgets the prefix — and a missing key becomes "" rather than undefined,
  // which would leave `import.meta.env.VITE_TLDRAW_LICENSE_KEY` as a syntax
  // error in the emitted bundle. Without a key, prod goes blank after 5s; see
  // the comment in src/client/TablePage.tsx.
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
