import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import { rendererCsp } from "./scripts/renderer-csp";

const dirname = path.dirname(fileURLToPath(import.meta.url));
// Only the signed release helper opts into updates. Ordinary builds stay local.
const releaseDefines = {
  __COPPER_UPDATES_ENABLED__: JSON.stringify(
    process.env.COPPER_RELEASE_UPDATES === "1" && process.platform === "darwin",
  ),
};

export default defineConfig({
  main: {
    define: releaseDefines,
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: path.resolve(dirname, "electron/main/index.ts"),
        },
      },
    },
  },
  preload: {
    define: releaseDefines,
    build: {
      externalizeDeps: false,
      rollupOptions: {
        input: {
          index: path.resolve(dirname, "electron/preload/index.ts"),
        },
        output: {
          format: "cjs",
          entryFileNames: "index.cjs",
          inlineDynamicImports: true,
        },
        external: ["electron"],
      },
    },
  },
  renderer: {
    define: releaseDefines,
    root: ".",
    plugins: [
      rendererCsp(),
      tanstackRouter({
        target: "react",
        autoCodeSplitting: false,
      }),
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(dirname, "./src"),
      },
    },
    build: {
      rollupOptions: {
        input: {
          index: path.resolve(dirname, "index.html"),
        },
      },
    },
    server: {
      port: 1420,
      strictPort: true,
    },
  },
});
