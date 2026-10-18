import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "../public",
    emptyOutDir: false,
    assetsDir: "assets",
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8080",
        changeOrigin: true
      },
      "/uploads": {
        target: "http://127.0.0.1:8080",
        changeOrigin: true
      }
    }
  }
});
