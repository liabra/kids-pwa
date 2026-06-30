import type { Express } from "express";
import { type Server } from "http";

/**
 * Aucune route applicative.
 *
 * Choix local-first : aucune donnée familiale ne transite par le serveur.
 * Le serveur sert UNIQUEMENT les fichiers statiques (Vite en dev, dossier
 * `dist` en prod). On ne déclare donc volontairement aucune route /api.
 */
export async function registerRoutes(
  httpServer: Server,
  _app: Express,
): Promise<Server> {
  return httpServer;
}
