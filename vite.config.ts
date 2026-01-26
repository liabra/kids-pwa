    import { defineConfig } from "vite";
    import react from "@vitejs/plugin-react";
    import { VitePWA } from "vite-plugin-pwa";
    import path from "node:path";
    import { fileURLToPath } from "node:url";

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    export default defineConfig({
      root: "client",
      resolve: {
        alias: {
          "@": path.resolve(__dirname, "client/src"),
        },
      },

      plugins: [
        react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "icons/icon-192.png",
        "icons/icon-512.png",
        "icons/maskable-192.png",
        "icons/maskable-512.png"
      ],
      manifest: {
        name: "Tableau des Champions",
        short_name: "Champions",
        description: "Gestion de tâches et points pour enfants (offline).",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#7c3aed",
        orientation: "portrait",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      },
      workbox: {
        navigateFallback: "/index.html"
      }
    })
  ]
});
