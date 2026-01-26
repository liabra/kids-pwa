          import express, { type Express } from "express";
          import fs from "fs";
          import path from "path";

          export function serveStatic(app: Express) {
            const distPath = path.resolve(__dirname, "..", "dist");

            if (!fs.existsSync(distPath)) {
              throw new Error(
                `Could not find the build directory: ${distPath}. Did you run the client build first?`,
              );
            }

            app.use(express.static(distPath));

            // SPA fallback (wouter) — Express 5 safe
            app.use((req, res, next) => {
              if (req.method !== "GET") return next();
              if (req.path.startsWith("/api")) return next();

              return res.sendFile(path.join(distPath, "index.html"));
            });
          }
