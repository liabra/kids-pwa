/**
 * iconCatalog.ts — Catalogue de pictogrammes pour les corvées d'enfants.
 *
 * Chaque tâche peut référencer un pictogramme par sa `key` (chaîne stable,
 * sérialisable). Ici on associe cette clé à un composant lucide-react (déjà
 * présent dans le projet — aucune nouvelle dépendance) et à un libellé français.
 *
 * Ajouter une entrée = ajouter une ligne ci-dessous. NE PAS renommer une `key`
 * existante (elle est stockée dans les données des utilisateurs).
 */
import {
  Smile,
  Bed,
  Blocks,
  Bath,
  Shirt,
  Utensils,
  Pencil,
  BookOpen,
  Backpack,
  PawPrint,
  Trash2,
  SprayCan,
  Droplets,
  Sprout,
  Footprints,
  GlassWater,
  Moon,
  Dumbbell,
  Music,
  Palette,
  type LucideIcon,
} from "lucide-react";

export interface IconCatalogEntry {
  key: string;
  label: string;
  Icon: LucideIcon;
}

export const ICON_CATALOG: IconCatalogEntry[] = [
  { key: "teeth", label: "Brossage de dents", Icon: Smile },
  { key: "bed", label: "Faire le lit", Icon: Bed },
  { key: "toys", label: "Ranger les jouets", Icon: Blocks },
  { key: "bath", label: "Bain / douche", Icon: Bath },
  { key: "dress", label: "S'habiller", Icon: Shirt },
  { key: "meal", label: "Repas / manger", Icon: Utensils },
  { key: "homework", label: "Devoirs", Icon: Pencil },
  { key: "reading", label: "Lecture", Icon: BookOpen },
  { key: "school", label: "Cartable / école", Icon: Backpack },
  { key: "pet", label: "Animal de compagnie", Icon: PawPrint },
  { key: "trash", label: "Sortir la poubelle", Icon: Trash2 },
  { key: "cleaning", label: "Ménage / balai", Icon: SprayCan },
  { key: "handwash", label: "Se laver les mains", Icon: Droplets },
  { key: "plants", label: "Arroser les plantes", Icon: Sprout },
  { key: "shoes", label: "Ranger les chaussures", Icon: Footprints },
  { key: "dishes", label: "Vaisselle", Icon: GlassWater },
  { key: "sleep", label: "Dodo / se coucher", Icon: Moon },
  { key: "sport", label: "Sport", Icon: Dumbbell },
  { key: "music", label: "Musique", Icon: Music },
  { key: "art", label: "Dessin / art", Icon: Palette },
];

// Mapping key -> composant, pour l'affichage rapide.
const ICON_BY_KEY: Record<string, LucideIcon> = Object.fromEntries(
  ICON_CATALOG.map((e) => [e.key, e.Icon]),
);

/**
 * Libellé français d'un pictogramme. Chaîne vide si la clé est absente ou
 * inconnue — permet de s'en servir directement pour pré-remplir un champ.
 */
export function getTaskIconLabel(key?: string): string {
  if (!key) return "";
  return ICON_CATALOG.find((entry) => entry.key === key)?.label ?? "";
}

/**
 * Renvoie le composant d'icône correspondant à une clé, ou null si la clé est
 * absente ou inconnue (tâche sans pictogramme, ou clé d'une version future).
 */
export function getTaskIcon(key?: string): LucideIcon | null {
  if (!key) return null;
  return ICON_BY_KEY[key] ?? null;
}
