/**
 * AddTaskPage — Formulaire d'ajout d'une tâche.
 * Déplacé depuis home.tsx sans modification.
 */
import PageShell from "@/components/PageShell";
import IconPicker from "@/components/IconPicker";
import { useAppState } from "@/context/AppStateContext";

const AddTaskPage = () => {
  const { newTaskName, setNewTaskName, newTaskIcon, setNewTaskIcon, addTask, goHome } = useAppState();

  return (
    <PageShell title="Ajouter une tâche" onHome={goHome}>
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto">
        <h3 className="text-2xl font-bold mb-4">Nouvelle tâche</h3>
        <input
          type="text"
          placeholder="Nom de la tâche"
          value={newTaskName}
          onChange={(e) => setNewTaskName(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
          onKeyDown={(e) => e.key === "Enter" && addTask()}
        />

        <label className="block text-sm font-semibold mb-2">Pictogramme (optionnel) :</label>
        <div className="mb-4">
          <IconPicker value={newTaskIcon} onChange={setNewTaskIcon} />
        </div>

        <div className="flex gap-2">
          <button onClick={addTask} className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
            Ajouter
          </button>
          <button
            onClick={() => {
              setNewTaskName("");
              setNewTaskIcon("");
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

export default AddTaskPage;
