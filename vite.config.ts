import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: process.env.VITE_BASE_PATH || "/",
  server: {
    host: "127.0.0.1",
    port: 8080,
    fs: { deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "**/.local/**", "**/.dev.vars", "**/php-api/**", "**/dist/api/**", "**/secret-friend-private/**", "**/output/**", "**/tmp/**", "**/*.{sqlite,sqlite3,db,key}", "**/*.sqlite3-*"] },
    proxy: {
      "/api": { target: "http://127.0.0.1:8787", changeOrigin: false },
      "/secret-friend": { target: "http://127.0.0.1:8787", changeOrigin: false },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
