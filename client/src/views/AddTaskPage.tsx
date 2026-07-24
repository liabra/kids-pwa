/**
 * AddTaskPage — Formulaire d'ajout d'une tâche.
 * Déplacé depuis home.tsx sans modification.
 */
import PageShell from "@/components/PageShell";
import IconPicker from "@/components/IconPicker";
import { getTaskIconLabel } from "@/lib/iconCatalog";
import { useAppState } from "@/context/AppStateContext";

const AddTaskPage = () => {
  const {
    newTaskName, setNewTaskName,
    newTaskIcon, setNewTaskIcon,
    newTaskPoints, setNewTaskPoints,
    addTask, goHome,
  } = useAppState();

  /**
   * Choisir un pictogramme pré-remplit le nom de la tâche, mais JAMAIS au
   * détriment d'une saisie manuelle : on ne réécrit que si le champ est vide
   * ou s'il contient encore le libellé posé par le pictogramme précédent.
   */
  const handleIconChange = (key: string) => {
    const previousLabel = getTaskIconLabel(newTaskIcon);
    const current = newTaskName.trim();
    const untouched = current === "" || current === previousLabel;
    setNewTaskIcon(key);
    if (untouched) setNewTaskName(getTaskIconLabel(key));
  };

  const VALUES = [
    { points: 1, label: "Routine", hint: "geste quotidien" },
    { points: 2, label: "Effort", hint: "demande de s'y mettre" },
    { points: 3, label: "Costaud", hint: "rare, difficile" },
  ];

  return (
    <PageShell title="Ajouter une tâche" onHome={goHome}>
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto">
        <h3 className="text-2xl font-bold mb-4">Nouvelle tâche</h3>
        <label htmlFor="task-name" className="block text-sm font-semibold mb-2">
          Nom de la tâche
        </label>
        <input
          id="task-name"
          type="text"
          placeholder="Ex. : Ranger sa chambre"
          value={newTaskName}
          onChange={(e) => setNewTaskName(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
          onKeyDown={(e) => e.key === "Enter" && addTask()}
        />

        <label className="block text-sm font-semibold mb-2">Valeur de la tâche</label>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {VALUES.map((v) => (
            <button
              key={v.points}
              type="button"
              onClick={() => setNewTaskPoints(v.points)}
              aria-pressed={newTaskPoints === v.points}
              className={`rounded-lg border-2 px-2 py-3 text-center transition ${
                newTaskPoints === v.points
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-blue-300"
              }`}
            >
              <div className="text-xl font-bold text-blue-700">{v.points}</div>
              <div className="text-xs font-semibold text-gray-700">{v.label}</div>
              <div className="text-[11px] text-gray-500 leading-tight">{v.hint}</div>
            </button>
          ))}
        </div>

        <label className="block text-sm font-semibold mb-1">Pictogramme (optionnel)</label>
        <p className="text-xs text-gray-500 mb-2">
          Choisir un pictogramme remplit le nom automatiquement. Tu peux le modifier ensuite.
        </p>
        <div className="mb-4">
          <IconPicker value={newTaskIcon} onChange={handleIconChange} />
        </div>

        <div className="flex gap-2">
          <button onClick={addTask} className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
            Ajouter
          </button>
          <button
            onClick={() => {
              setNewTaskName("");
              setNewTaskIcon("");
              setNewTaskPoints(1);
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
