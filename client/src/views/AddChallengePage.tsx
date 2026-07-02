/**
 * AddChallengePage — Formulaire d'ajout d'un défi.
 * Déplacé depuis home.tsx sans modification.
 */
import PageShell from "@/components/PageShell";
import { useAppState } from "@/context/AppStateContext";

const AddChallengePage = () => {
  const {
    newChallengeName, setNewChallengeName,
    newChallengePoints, setNewChallengePoints,
    addChallenge, goHome,
  } = useAppState();

  return (
    <PageShell title="Ajouter un défi" onHome={goHome}>
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto">
        <h3 className="text-2xl font-bold mb-4">Nouveau défi</h3>
        <input
          type="text"
          placeholder="Nom du défi"
          value={newChallengeName}
          onChange={(e) => setNewChallengeName(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
        />
        <input
          type="number"
          placeholder="Points perdus si raté"
          value={newChallengePoints}
          onChange={(e) => setNewChallengePoints(parseInt(e.target.value) || 0)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
        />
        <div className="flex gap-2">
          <button onClick={addChallenge} className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition">
            Ajouter
          </button>
          <button
            onClick={() => {
              setNewChallengeName("");
              setNewChallengePoints(2);
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

export default AddChallengePage;
