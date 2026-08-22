import { defineConfig } from "vite";
import { resolve } from "path";

// Content scripts CANNOT use ES module imports

export default defineConfig({
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
    emptyOutDir: false, // don't wipe out the main build's output
    rollupOptions: {
      input: resolve(__dirname, "src/content/index.ts"),
      output: {
        entryFileNames: "content.js",
        format: "iife", // self-contained, classic script — no import/export
        inlineDynamicImports: true
      }
    }
  }
});