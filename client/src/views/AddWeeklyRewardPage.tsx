/**
 * AddWeeklyRewardPage — Formulaire d'ajout d'une récompense hebdomadaire.
 * Déplacé depuis home.tsx sans modification.
 */
import PageShell from "@/components/PageShell";
import RewardOwnerPicker from "@/components/RewardOwnerPicker";
import { useAppState } from "@/context/AppStateContext";

const AddWeeklyRewardPage = () => {
  const {
    newWeeklyRewardName, setNewWeeklyRewardName,
    newWeeklyRewardPoints, setNewWeeklyRewardPoints,
    newWeeklyRewardChildId, setNewWeeklyRewardChildId,
    addWeeklyReward, goHome,
  } = useAppState();

  return (
    <PageShell title="Ajouter une récompense hebdomadaire" onHome={goHome}>
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto">
        <h3 className="text-2xl font-bold mb-4">Nouvelle récompense hebdo</h3>
        <label htmlFor="weekly-reward-name" className="block text-sm font-semibold mb-2">
          Nom de la récompense
        </label>
        <input
          id="weekly-reward-name"
          type="text"
          placeholder="Ex. : Switch 45 min le dimanche"
          value={newWeeklyRewardName}
          onChange={(e) => setNewWeeklyRewardName(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
        />
        <label htmlFor="weekly-reward-points" className="block text-sm font-semibold mb-1">
          Points à atteindre sur la semaine
        </label>
        <p className="text-xs text-gray-500 mb-2">Vise environ 70 % d'une semaine parfaite : un seul mauvais jour ne doit pas condamner la semaine.</p>
        <input
          id="weekly-reward-points"
          type="number"
          min={0}
          placeholder="Ex. : 42"
          value={newWeeklyRewardPoints}
          onChange={(e) => setNewWeeklyRewardPoints(parseInt(e.target.value) || 0)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
        />
        <RewardOwnerPicker value={newWeeklyRewardChildId} onChange={setNewWeeklyRewardChildId} />

        <div className="flex gap-2">
          <button onClick={addWeeklyReward} className="flex-1 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition">
            Ajouter
          </button>
          <button
            onClick={() => {
              setNewWeeklyRewardName("");
              setNewWeeklyRewardPoints(20);
              setNewWeeklyRewardChildId(null);
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

export default AddWeeklyRewardPage;
