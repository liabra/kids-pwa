/**
 * parentLock.ts — Verrou parent par code PIN, 100 % sur l'appareil.
 *
 * Le PIN n'est JAMAIS stocké en clair. On stocke uniquement :
 *  - un sel aléatoire (unique par appareil),
 *  - le hash PBKDF2-HMAC-SHA256 du PIN,
 *  - le nombre d'itérations utilisé.
 *
 * Vérifier un PIN = redériver le hash avec le sel stocké et comparer.
 * Aucune récupération n'est possible : si le PIN est oublié, le seul recours
 * est resetAll() (effacement total des données).
 *
 * Choix d'implémentation : le verrou vit dans une base IndexedDB DÉDIÉE
 * ("champions-lock"), séparée des données de l'app ("champions-db"). Ainsi le
 * hash du PIN n'est jamais inclus dans une sauvegarde de données familiales,
 * et restaurer une sauvegarde ne modifie pas le PIN de l'appareil courant.
 *
 * On NE modifie pas db.ts : pour resetAll() on appelle son API publique
 * importAll({}), qui vide le magasin de données de l'app.
 */

import { importAll } from "./db";

const DB_NAME = "champions-lock";
const DB_VERSION = 1;
const STORE = "lock";
const RECORD_KEY = "parent-pin";

// >= 200000 itérations (exigence de l'énoncé). PBKDF2-HMAC-SHA256.
const PBKDF2_ITERATIONS = 210_000;
const SALT_BYTES = 16;
const HASH_BITS = 256;

interface PinRecord {
  salt: string; // base64
  hash: string; // base64
  iterations: number;
}

/* ------------------------------------------------------------------ */
/* IndexedDB minimal dédié au verrou                                   */
/* ------------------------------------------------------------------ */

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

function getRecord(): Promise<PinRecord | undefined> {
  return openDB().then(
    (db) =>
      new Promise<PinRecord | undefined>((resolve, reject) => {
        const tx = db.transaction(STORE, "readonly");
        const req = tx.objectStore(STORE).get(RECORD_KEY);
        req.onsuccess = () => resolve(req.result as PinRecord | undefined);
        req.onerror = () => reject(req.error);
      }),
  );
}

function putRecord(record: PinRecord): Promise<void> {
  return openDB().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put(record, RECORD_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }),
  );
}

function clearStore(): Promise<void> {
  return openDB().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }),
  );
}

/* ------------------------------------------------------------------ */
/* Base64                                                              */
/* ------------------------------------------------------------------ */

function bufToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/* ------------------------------------------------------------------ */
/* Dérivation PBKDF2                                                   */
/* ------------------------------------------------------------------ */

async function derive(
  pin: string,
  salt: Uint8Array,
  iterations: number,
): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial,
    HASH_BITS,
  );
  return bufToBase64(bits);
}

/** Comparaison à temps constant (évite les fuites de timing). */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* ------------------------------------------------------------------ */
/* API publique                                                        */
/* ------------------------------------------------------------------ */

/** Un PIN parent a-t-il déjà été défini sur cet appareil ? */
export async function isPinSet(): Promise<boolean> {
  return (await getRecord()) !== undefined;
}

/** Définit (ou remplace) le PIN parent. */
export async function setPin(pin: string): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(pin, salt, PBKDF2_ITERATIONS);
  await putRecord({
    salt: bufToBase64(salt.buffer),
    hash,
    iterations: PBKDF2_ITERATIONS,
  });
}

/** Vérifie un PIN. Renvoie false si aucun PIN n'est défini. */
export async function verifyPin(pin: string): Promise<boolean> {
  const record = await getRecord();
  if (!record) return false;
  const candidate = await derive(
    pin,
    base64ToBytes(record.salt),
    record.iterations,
  );
  return constantTimeEqual(candidate, record.hash);
}

/**
 * Efface TOUT : les données de l'app et le PIN parent.
 * Seul recours en cas d'oubli du PIN. Irréversible.
 */
export async function resetAll(): Promise<void> {
  await importAll({}); // vide le magasin de données de l'app
  await clearStore(); // supprime le PIN parent
  try {
    localStorage.removeItem("__migrated_to_idb");
  } catch {
    // localStorage indisponible : sans importance ici.
  }
}
