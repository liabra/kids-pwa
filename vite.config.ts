    import { defineConfig, type Plugin } from "vite";
    import react from "@vitejs/plugin-react";
    import { VitePWA } from "vite-plugin-pwa";
    import path from "node:path";
    import { fileURLToPath } from "node:url";

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    // CSP stricte pour une app statique 100 % locale.
    // Note 'unsafe-inline' dans style-src : Tailwind et certains composants UI
    // injectent des styles au runtime ; cette tolérance ne concerne QUE les styles
    // (pas les scripts), le risque est donc minime. script-src reste 'self'.
    // frame-ancestors est volontairement ABSENT ici car les balises <meta>
    // l'ignorent (warning console) : il est appliqué via en-tête dans static.ts.
    const CSP_META = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "img-src 'self' data:",
      "font-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self'",
      "connect-src 'self'",
      "manifest-src 'self'",
      "worker-src 'self'",
      "form-action 'self'",
    ].join("; ");

    // Plugin : injecte la balise meta CSP UNIQUEMENT dans le build de prod
    // (en dev, le preamble inline de React Refresh exige une CSP plus souple).
    const cspMetaPlugin: Plugin = {
      name: "csp-meta",
      apply: "build",
      transformIndexHtml() {
        return [
          {
            tag: "meta",
            attrs: {
              "http-equiv": "Content-Security-Policy",
              content: CSP_META,
            },
            injectTo: "head-prepend",
          },
        ];
      },
    };

    export default defineConfig({
      root: "client",
      resolve: {
        alias: {
          "@": path.resolve(__dirname, "client/src"),
        },
      },

      plugins: [
        cspMetaPlugin,
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
