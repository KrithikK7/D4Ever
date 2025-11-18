import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const backgroundImagesDir = path.resolve(
  import.meta.dirname,
  "background",
  "images",
);

export default defineConfig({
  plugins: [
    react(),
    {
      name: "background-images-watcher",
      enforce: "post",
      configureServer(server) {
        const triggerReload = (file: string) => {
          if (file.startsWith(backgroundImagesDir)) {
            server.ws.send({ type: "full-reload" });
          }
        };

        server.watcher.add(backgroundImagesDir);
        server.watcher.on("add", triggerReload);
        server.watcher.on("unlink", triggerReload);
      },
    },
    // Temporarily disabled to prevent overlay blocking while debugging
    // runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      "@background": path.resolve(import.meta.dirname, "background"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      allow: [
        path.resolve(import.meta.dirname, "background"),
        path.resolve(import.meta.dirname, "client"),
      ],
      deny: ["**/.*"],
    },
  },
});
