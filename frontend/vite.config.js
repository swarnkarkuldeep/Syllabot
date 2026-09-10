import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The frontend calls the backend through an `/api` prefix so the same origin
// serves the whole app in dev. Vite proxies `/api/*` to the FastAPI backend
// and strips the prefix, since the backend routes live at the root
// (`/chat`, `/feedback`, `/health`).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});