/**
 * Script ponctuel : génère les PNG des icônes PWA à partir des sources SVG.
 *
 *   npx tsx script/generate-icons.ts
 *
 * Sources : client/public/icons/icon.svg (purpose "any")
 *           client/public/icons/maskable.svg (purpose "maskable", zone de sécurité)
 */
import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ICONS = path.resolve(__dirname, "..", "client", "public", "icons");
const PUBLIC = path.resolve(__dirname, "..", "client", "public");

const jobs: Array<{ src: string; out: string; size: number }> = [
  { src: `${ICONS}/icon.svg`, out: `${ICONS}/icon-192.png`, size: 192 },
  { src: `${ICONS}/icon.svg`, out: `${ICONS}/icon-512.png`, size: 512 },
  { src: `${ICONS}/maskable.svg`, out: `${ICONS}/maskable-192.png`, size: 192 },
  { src: `${ICONS}/maskable.svg`, out: `${ICONS}/maskable-512.png`, size: 512 },
  { src: `${ICONS}/icon.svg`, out: `${PUBLIC}/favicon.png`, size: 64 },
];

async function run() {
  for (const { src, out, size } of jobs) {
    await sharp(src, { density: 384 })
      .resize(size, size)
      .png()
      .toFile(out);
    console.log(`✓ ${path.basename(out)} (${size}x${size})`);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
