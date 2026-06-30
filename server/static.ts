import express, { type Express } from "express";
import fs from "fs";
import path from "path";

// CSP complète appliquée en prod via en-tête HTTP. Identique à la balise meta
// injectée au build (voir vite.config.ts), avec en plus frame-ancestors 'none'
// (ignoré dans une balise meta, donc seulement utile en en-tête).
// 'unsafe-inline' n'est toléré que pour style-src (styles injectés par Tailwind
// et certains composants UI) ; script-src reste strict ('self').
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "img-src 'self' data:",
  "font-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self'",
  "connect-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
  "form-action 'self'",
].join("; ");

function securityHeaders(
  _req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  res.setHeader("Content-Security-Policy", CSP);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), camera=(), microphone=(), payment=(), usb=()",
  );
  next();
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "..", "client", "dist");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the client build directory: ${distPath}. Did you run the client build first?`,
    );
  }

  app.use(securityHeaders);
  app.use(express.static(distPath));

  app.use((req, res, next) => {
    if (req.method !== "GET") return next();
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(distPath, "index.html"));
  });
}
