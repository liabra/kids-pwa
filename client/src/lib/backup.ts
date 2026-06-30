/**
 * backup.ts — Sauvegarde et restauration chiffrées de bout en bout (E2E).
 *
 * Principe : toutes les données de l'app sont chiffrées sur l'appareil de
 * l'utilisateur avec SA phrase secrète, puis exportées dans un fichier `.champions`.
 * La clé et les données ne quittent jamais l'appareil. Personne (nous compris)
 * ne peut déchiffrer le fichier sans la phrase secrète.
 *
 * Techniquement :
 *  - Dérivation de clé : PBKDF2-HMAC-SHA256 (lent à brute-forcer).
 *  - Chiffrement : AES-GCM 256 bits (chiffre + vérifie l'intégrité).
 *  - 100 % API Web Crypto native du navigateur, aucune dépendance externe.
 *
 * Fonctionne dans le PWA, dans une APK (TWA/Bubblewrap) et dans Capacitor,
 * car ces environnements tournent tous en "contexte sécurisé".
 */

const MAGIC = "CHAMPIONS-BACKUP";
const FORMAT_VERSION = 1;

// Recommandation OWASP (2023) pour PBKDF2-SHA256. Stocké dans le fichier :
// si on augmente cette valeur plus tard, les anciennes sauvegardes restent lisibles.
const PBKDF2_ITERATIONS = 600_000;
const SALT_BYTES = 16; // sel aléatoire, unique par sauvegarde
const IV_BYTES = 12; // taille recommandée pour AES-GCM

const MIN_PASSPHRASE_LENGTH = 8;

/** Structure du fichier de sauvegarde (tout est en clair SAUF `data`). */
export interface BackupFile {
  magic: string;
  version: number;
  createdAt: string;
  kdf: { name: "PBKDF2"; hash: "SHA-256"; iterations: number; salt: string };
  cipher: { name: "AES-GCM"; iv: string };
  data: string; // texte chiffré, encodé en base64
}

/* ------------------------------------------------------------------ */
/* Utilitaires base64 (compatibles navigateur, APK et Capacitor)       */
/* ------------------------------------------------------------------ */

function bufToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000; // évite un dépassement de pile sur les gros tableaux
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToBuf(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/* ------------------------------------------------------------------ */
/* Dérivation de clé                                                   */
/* ------------------------------------------------------------------ */

async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number,
): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false, // la clé n'est pas exportable
    ["encrypt", "decrypt"],
  );
}

/* ------------------------------------------------------------------ */
/* API publique                                                        */
/* ------------------------------------------------------------------ */

/**
 * Chiffre un objet quelconque et renvoie le contenu texte du fichier `.champions`.
 * @throws si la phrase secrète est trop courte.
 */
export async function exportEncrypted(
  payload: unknown,
  passphrase: string,
): Promise<string> {
  if (!passphrase || passphrase.length < MIN_PASSPHRASE_LENGTH) {
    throw new Error(
      `Phrase secrète trop courte (${MIN_PASSPHRASE_LENGTH} caractères minimum).`,
    );
  }

  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(passphrase, salt, PBKDF2_ITERATIONS);

  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintext,
  );

  const file: BackupFile = {
    magic: MAGIC,
    version: FORMAT_VERSION,
    createdAt: new Date().toISOString(),
    kdf: {
      name: "PBKDF2",
      hash: "SHA-256",
      iterations: PBKDF2_ITERATIONS,
      salt: bufToBase64(salt.buffer),
    },
    cipher: { name: "AES-GCM", iv: bufToBase64(iv.buffer) },
    data: bufToBase64(ciphertext),
  };

  return JSON.stringify(file, null, 2);
}

/**
 * Déchiffre le contenu d'un fichier `.champions` et renvoie l'objet d'origine.
 * @throws si le fichier est invalide, ou si la phrase secrète est incorrecte.
 */
export async function importEncrypted<T = unknown>(
  fileContent: string,
  passphrase: string,
): Promise<T> {
  let file: BackupFile;
  try {
    file = JSON.parse(fileContent);
  } catch {
    throw new Error("Fichier de sauvegarde illisible.");
  }

  if (file?.magic !== MAGIC) {
    throw new Error("Ce fichier n'est pas une sauvegarde Champions.");
  }
  if (file.version > FORMAT_VERSION) {
    throw new Error(
      "Cette sauvegarde a été créée par une version plus récente de l'app.",
    );
  }

  // On relit le sel, l'IV et le nombre d'itérations DEPUIS le fichier,
  // pour que d'anciennes sauvegardes restent restaurables après une mise à jour.
  const salt = new Uint8Array(base64ToBuf(file.kdf.salt));
  const iv = new Uint8Array(base64ToBuf(file.cipher.iv));
  const key = await deriveKey(passphrase, salt, file.kdf.iterations);

  let plaintext: ArrayBuffer;
  try {
    plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      base64ToBuf(file.data),
    );
  } catch {
    // AES-GCM échoue si la clé (donc la phrase) est mauvaise OU si le fichier
    // a été modifié : dans les deux cas, on ne peut pas faire confiance au contenu.
    throw new Error("Phrase secrète incorrecte ou fichier corrompu.");
  }

  return JSON.parse(new TextDecoder().decode(plaintext)) as T;
}

/** Nom de fichier suggéré pour une sauvegarde (ex. champions-2026-06-30.champions). */
export function suggestBackupFilename(date = new Date()): string {
  const iso = date.toISOString().slice(0, 10);
  return `champions-${iso}.champions`;
}
