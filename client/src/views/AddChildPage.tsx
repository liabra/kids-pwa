/**
 * AddChildPage — Formulaire d'ajout d'un enfant.
 * Déplacé depuis home.tsx sans modification.
 */
import PageShell from "@/components/PageShell";
import { useAppState } from "@/context/AppStateContext";

const AddChildPage = () => {
  const {
    newChildName, setNewChildName,
    newChildColor, setNewChildColor,
    colors, addChild, goHome,
  } = useAppState();

  return (
    <PageShell title="Ajouter un enfant" onHome={goHome}>
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto">
        <h3 className="text-2xl font-bold mb-4">Nouvel enfant</h3>
        <label htmlFor="child-name" className="block text-sm font-semibold mb-2">
          Nom de l&apos;enfant
        </label>
        <input
          id="child-name"
          type="text"
          placeholder="Ex. : Lina"
          value={newChildName}
          onChange={(e) => setNewChildName(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
          onKeyDown={(e) => e.key === "Enter" && addChild()}
        />
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2">Couleur:</label>
          <div className="grid grid-cols-4 gap-2">
            {colors.map((color) => (
              <button
                key={color}
                onClick={() => setNewChildColor(color)}
                className={`w-full h-12 rounded-lg border-4 transition ${
                  newChildColor === color ? "border-gray-800 scale-110" : "border-transparent"
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={addChild} className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition">
            Ajouter
          </button>
          <button
            onClick={() => {
              setNewChildName("");
              goHome();
            }}
            className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
          >
            Annuler
          </button>
        </div>
      </div>
    </PageShell>
  );
};

export default AddChildPage;
