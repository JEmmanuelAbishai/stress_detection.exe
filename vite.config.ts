import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { resolve } from "path";

// Chrome extensions need predictable, unhashed filenames because manifest.json
// references them directly (e.g. "background.js", "popup.html"). We build
// each surface (popup / dashboard / settings / background / content) as its
// own Rollup entry point instead of relying on Vite's default SPA behavior.
export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        { src: "manifest.json", dest: "." },
        { src: "public/icons", dest: "." },
        { src: "src/ml/model", dest: "ml" },
        // onnxruntime-web ships .wasm files that must be served as-is
        { src: "node_modules/onnxruntime-web/dist/*.wasm", dest: "." }
      ]
    })
  ],
  resolve: {
    alias: {
      "@shared": resolve(__dirname, "src/shared"),
      "@utils": resolve(__dirname, "src/utils"),
      "@storage": resolve(__dirname, "src/storage"),
      "@ml": resolve(__dirname, "src/ml"),
      "@reports": resolve(__dirname, "src/reports")
    }
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "src/popup/popup.html"),
        dashboard: resolve(__dirname, "src/dashboard/dashboard.html"),
        settings: resolve(__dirname, "src/settings/settings.html"),
        background: resolve(__dirname, "src/background/index.ts"),
        content: resolve(__dirname, "src/content/index.ts")
      },
      output: {
        // Keep top-level scripts unhashed so manifest.json paths stay valid.
        entryFileNames: (chunk) => {
          if (chunk.name === "background" || chunk.name === "content") {
            return "[name].js";
          }
          return "assets/[name]-[hash].js";
        },
        chunkFileNames: "assets/chunk-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]"
      }
    }
  }
});
