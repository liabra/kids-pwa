/**
 * RewardOwnerPicker — Choix du destinataire d'une récompense.
 *
 * `null` = récompense commune, visible par tous les enfants (valeur par défaut,
 * qui reproduit le comportement historique de l'application).
 */
import { useAppState } from "@/context/AppStateContext";
import type { ID } from "@/lib/types";

const RewardOwnerPicker = ({
  value,
  onChange,
}: {
  value: ID | null;
  onChange: (id: ID | null) => void;
}) => {
  const { children } = useAppState();
  if (children.length === 0) return null;

  const options: { id: ID | null; name: string; color?: string }[] = [
    { id: null, name: "Tous" },
    ...children.map((c) => ({ id: c.id, name: c.name, color: c.color })),
  ];

  return (
    <>
      <label className="block text-sm font-semibold mb-2">Pour qui ?</label>
      <div className="flex flex-wrap gap-2 mb-4">
        {options.map((o) => {
          const selected = value === o.id;
          return (
            <button
              key={String(o.id)}
              type="button"
              onClick={() => onChange(o.id)}
              aria-pressed={selected}
              className={`rounded-full border-2 px-4 py-2 text-sm font-semibold transition ${
                selected ? "border-purple-500 bg-purple-50" : "border-gray-200 hover:border-purple-300"
              }`}
              style={o.color && selected ? { color: o.color } : undefined}
            >
              {o.name}
            </button>
          );
        })}
      </div>
    </>
  );
};

export default RewardOwnerPicker;
