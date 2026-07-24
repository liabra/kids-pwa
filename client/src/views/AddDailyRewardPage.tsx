/**
 * AddDailyRewardPage — Formulaire d'ajout d'une récompense quotidienne.
 * Déplacé depuis home.tsx sans modification.
 */
import PageShell from "@/components/PageShell";
import RewardOwnerPicker from "@/components/RewardOwnerPicker";
import { useAppState } from "@/context/AppStateContext";

const AddDailyRewardPage = () => {
  const {
    newRewardName, setNewRewardName,
    newRewardPoints, setNewRewardPoints,
    newRewardChildId, setNewRewardChildId,
    addDailyReward, goHome,
  } = useAppState();

  return (
    <PageShell title="Ajouter une récompense quotidienne" onHome={goHome}>
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto">
        <h3 className="text-2xl font-bold mb-4">Nouvelle récompense</h3>
        <label htmlFor="daily-reward-name" className="block text-sm font-semibold mb-2">
          Nom de la récompense
        </label>
        <input
          id="daily-reward-name"
          type="text"
          placeholder="Ex. : Choisir l'histoire du soir"
          value={newRewardName}
          onChange={(e) => setNewRewardName(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
        />
        <label htmlFor="daily-reward-points" className="block text-sm font-semibold mb-1">
          Points à atteindre dans la journée
        </label>
        <p className="text-xs text-gray-500 mb-2">La récompense s'affiche dès que l'enfant atteint ce total sur la journée.</p>
        <input
          id="daily-reward-points"
          type="number"
          min={0}
          placeholder="Ex. : 6"
          value={newRewardPoints}
          onChange={(e) => setNewRewardPoints(parseInt(e.target.value) || 0)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
        />
        <RewardOwnerPicker value={newRewardChildId} onChange={setNewRewardChildId} />

        <div className="flex gap-2">
          <button onClick={addDailyReward} className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition">
            Ajouter
          </button>
          <button
            onClick={() => {
              setNewRewardName("");
              setNewRewardPoints(5);
              setNewRewardChildId(null);
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
