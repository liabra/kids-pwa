/**
 * ManageTasksPage — Assignation des tâches à un enfant.
 * Déplacé depuis home.tsx (renderManageTasksPage) sans modification.
 */
import PageShell from "@/components/PageShell";
import TaskIcon from "@/components/TaskIcon";
import { useAppState } from "@/context/AppStateContext";

const ManageTasksPage = () => {
  const { selectedChild, goHome, tasks, toggleTaskAssignment } = useAppState();

  if (!selectedChild) return <PageShell title="Gérer les tâches" onHome={goHome}>Enfant introuvable.</PageShell>;

  return (
    <PageShell title={`Gérer les tâches - ${selectedChild.name}`} onHome={goHome}>
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto">
        <div className="space-y-2 mb-4">
          {tasks.length === 0 && <div className="text-gray-600">Aucune tâche disponible pour le moment.</div>}
          {tasks.map((task) => {
            const isAssigned = selectedChild.assignedTasks.includes(task.id);
            return (
              <label key={task.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                <input
                  type="checkbox"
                  checked={isAssigned}
                  onChange={() => toggleTaskAssignment(selectedChild.id, task.id)}
                  className="w-5 h-5 text-blue-500 rounded"
                />
                <TaskIcon iconKey={task.icon} size={18} />
                <span className="text-gray-800">{task.name}</span>
              </label>
            );
          })}
        </div>
        <button onClick={goHome} className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition">
          Terminer
        </button>
      </div>
    </PageShell>
  );
};

export default ManageTasksPage;
