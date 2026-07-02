/**
 * TaskIcon — Pictogramme d'une tâche, posé sur une pastille ronde colorée.
 *
 * Si la tâche n'a pas d'icône (ou une clé inconnue), n'affiche RIEN — pas de
 * trou disgracieux, et rétrocompatibilité totale avec les tâches existantes.
 *
 * NB : le prop s'appelle `iconKey` (et non `key`) car `key` est réservé par
 * React et ne serait pas transmis dans les props.
 */
import { getTaskIcon } from "@/lib/iconCatalog";

const TaskIcon = ({ iconKey, size = 24 }: { iconKey?: string; size?: number }) => {
  const Icon = getTaskIcon(iconKey);
  if (!Icon) return null;

  const pad = Math.round(size * 0.34);
  const box = size + pad * 2;

  return (
    <span
      className="inline-flex items-center justify-center rounded-full bg-purple-100 text-purple-600 shrink-0"
      style={{ width: box, height: box }}
      aria-hidden="true"
    >
      <Icon size={size} />
    </span>
  );
};

export default TaskIcon;
