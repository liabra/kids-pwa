/**
 * AddDailyRewardPage — Formulaire d'ajout d'une récompense quotidienne.
 * Déplacé depuis home.tsx sans modification.
 */
import PageShell from "@/components/PageShell";
import { useAppState } from "@/context/AppStateContext";

const AddDailyRewardPage = () => {
  const {
    newRewardName, setNewRewardName,
    newRewardPoints, setNewRewardPoints,
    addDailyReward, goHome,
  } = useAppState();

  return (
    <PageShell title="Ajouter une récompense quotidienne" onHome={goHome}>
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto">
        <h3 className="text-2xl font-bold mb-4">Nouvelle récompense</h3>
        <input
          type="text"
          placeholder="Nom de la récompense"
          value={newRewardName}
          onChange={(e) => setNewRewardName(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
        />
        <input
          type="number"
          placeholder="Points requis"
          value={newRewardPoints}
          onChange={(e) => setNewRewardPoints(parseInt(e.target.value) || 0)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
        />
        <div className="flex gap-2">
          <button onClick={addDailyReward} className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition">
            Ajouter
          </button>
          <button
            onClick={() => {
              setNewRewardName("");
              setNewRewardPoints(5);
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

export default AddDailyRewardPage;
