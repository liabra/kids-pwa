/**
 * db.ts — Stockage local persistant, 100 % sur l'appareil de l'utilisateur.
 *
 * Remplace `localStorage` par IndexedDB :
 *  - bien plus de capacité (localStorage est limité à ~5 Mo),
 *  - plus fiable (pas de perte silencieuse quand c'est plein),
 *  - asynchrone (ne bloque pas l'affichage).
 *
 * Aucune donnée ne sort de l'appareil : il n'y a pas de serveur.
 * Modèle clé → valeur, calqué sur l'usage actuel de l'app (6 "clés" JSON),
 * pour que la migration soit simple et sans risque.
 */

const DB_NAME = "champions-db";
const DB_VERSION = 1;
const STORE = "app-state";

/** Clés de données utilisées par l'app (identiques à l'ancien localStorage). */
export const APP_KEYS = [
  "children",
  "tasks",
  "dailyRewards",
  "challenges",
  "weeklyRewards",
  "dailyData",
] as const;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const request = run(transaction.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }),
  );
}

/* ------------------------------------------------------------------ */
/* API clé/valeur                                                      */
/* ------------------------------------------------------------------ */

export async function get<T>(key: string): Promise<T | undefined> {
  return tx<T | undefined>(
    "readonly",
    (s) => s.get(key) as IDBRequest<T | undefined>,
  );
}

export async function set<T>(key: string, value: T): Promise<void> {
  // On stocke une copie structurée (jamais une référence vivante).
  await tx("readwrite", (s) => s.put(value as unknown, key));
}

export async function del(key: string): Promise<void> {
  await tx("readwrite", (s) => s.delete(key));
}

export async function keys(): Promise<string[]> {
  const result = await tx<IDBValidKey[]>("readonly", (s) => s.getAllKeys());
  return result.map(String);
}

/* ------------------------------------------------------------------ */
/* Export / import global (pour la sauvegarde chiffrée)                */
/* ------------------------------------------------------------------ */

/** Renvoie un instantané de toutes les données de l'app. */
export async function exportAll(): Promise<Record<string, unknown>> {
  const snapshot: Record<string, unknown> = {};
  for (const key of await keys()) {
    snapshot[key] = await get(key);
  }
  return snapshot;
}

/** Remplace toutes les données par celles d'un instantané (restauration). */
export async function importAll(
  snapshot: Record<string, unknown>,
): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");
    const store = transaction.objectStore(STORE);
    store.clear();
    for (const [key, value] of Object.entries(snapshot)) {
      store.put(value, key);
    }
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/* ------------------------------------------------------------------ */
/* Migration depuis localStorage (exécutée une seule fois)             */
/* ------------------------------------------------------------------ */

/**
 * Copie les données existantes de localStorage vers IndexedDB, une seule fois.
 * À appeler au tout premier lancement après la mise à jour de l'app.
 * @returns true si une migration a eu lieu.
 */
export async function migrateFromLocalStorage(): Promise<boolean> {
  if (typeof localStorage === "undefined") return false;
  if (localStorage.getItem("__migrated_to_idb") === "1") return false;

  let migrated = false;
  for (const key of APP_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw == null) continue;
    try {
      await set(key, JSON.parse(raw));
      migrated = true;
    } catch {
      // Donnée illisible : on l'ignore plutôt que de bloquer la migration.
    }
  }

  // On marque la migration faite. On NE supprime PAS encore l'ancien localStorage
  // (filet de sécurité au cas où l'utilisateur reviendrait à une ancienne version).
  localStorage.setItem("__migrated_to_idb", "1");
  return migrated;
}
