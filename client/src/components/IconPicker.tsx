/**
 * IconPicker — Grille tactile de pictogrammes pour choisir l'icône d'une tâche.
 *
 * Props : value (clé sélectionnée, "" = aucune) + onChange(key).
 * Grandes cases adaptées au tactile ; la case sélectionnée est mise en évidence.
 * Une case "Aucune" permet de ne pas mettre d'icône.
 */
import { Ban } from "lucide-react";
import { ICON_CATALOG } from "@/lib/iconCatalog";

const cellClass = (selected: boolean) =>
  `flex flex-col items-center justify-center gap-1 p-2 min-h-[72px] rounded-xl border-2 transition text-center ${
    selected
      ? "border-purple-500 bg-purple-50 text-purple-700"
      : "border-transparent bg-gray-50 text-gray-600 hover:bg-gray-100"
  }`;

const IconPicker = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (key: string) => void;
}) => {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      <button type="button" onClick={() => onChange("")} className={cellClass(!value)}>
        <Ban size={26} />
        <span className="text-xs leading-tight">Aucune</span>
      </button>

      {ICON_CATALOG.map(({ key, label, Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={cellClass(value === key)}
          title={label}
        >
          <Icon size={26} />
          <span className="text-xs leading-tight">{label}</span>
        </button>
      ))}
    </div>
  );
};

export default IconPicker;
