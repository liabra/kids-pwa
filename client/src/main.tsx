import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { migrateFromLocalStorage } from "@/lib/db";
import App from "./App";
import "./index.css";

registerSW({ immediate: true });

// Migration unique localStorage -> IndexedDB AVANT le rendu, pour ne pas perdre
// les données des utilisateurs existants. La migration est idempotente (marquée
// faite une seule fois) et ne bloque jamais le démarrage en cas d'erreur.
migrateFromLocalStorage()
  .catch(() => {
    // Migration impossible (mode privé, quota...) : on démarre quand même.
  })
  .finally(() => {
    createRoot(document.getElementById("root")!).render(<App />);
  });
