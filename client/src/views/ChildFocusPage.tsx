/**
 * ChildFocusPage — Vue « focus enfant » plein écran.
 *
 * Même tableau glisser-déposer que l'accueil, mais en grand format : cibles
 * tactiles nettement plus larges, pensées pour de petits doigts sur tablette.
 * Accessible d'un simple toucher sur le prénom depuis l'accueil.
 *
 * Vue NON sensible : elle n'expose aucune action de gestion, elle reste donc
 * disponible en mode enfant (comme l'historique).
 */
import { Trophy } from "lucide-react";
import PageShell from "@/components/PageShell";
import TaskBoard from "@/components/TaskBoard";
import { useAppState } from "@/context/AppStateContext";
import { getDayName } from "@/lib/points";
import { celebrate } from "@/lib/celebrate";

const ChildFocusPage = () => {
  const {
    selectedChild,
    tasks,
    dailyRewards,
    currentDate,
    goHome,
    isTaskCompleted,
    toggleTaskCompletion,
    getDailyPoints,
    getTierInfo,
    soundEnabled,
  } = useAppState();

  if (!selectedChild) {
    return (
      <PageShell title="Tâches" onHome={goHome}>
        <div className="bg-white rounded-xl shadow-lg p-6 text-center text-gray-600">
          Enfant introuvable.
        </div>
      </PageShell>
    );
  }

  const child = selectedChild;
  const childTasks = tasks.filter((task) => child.assignedTasks.includes(task.id));
  const dailyPoints = getDailyPoints(child.id, currentDate);
  const tierInfo = getTierInfo(dailyPoints);
  const TierIcon = tierInfo.icon;
  const availableRewards = dailyRewards.filter((r) => dailyPoints >= r.points);

  return (
    <PageShell title={child.name} onHome={goHome}>
      <div className="bg-white rounded-xl shadow-xl p-4 md:p-6">
        {/* En-tête : jour + score du jour */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <div className="text-xl font-bold" style={{ color: child.color }}>
              {getDayName(currentDate)}
            </div>
            <div className="text-sm text-gray-500">
              {currentDate.toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <TierIcon className={`${tierInfo.color} ${tierInfo.animation}`} size={48} />
            <div className="text-center">
              <div
                className={`text-5xl font-bold ${
                  dailyPoints < 0 ? "text-red-600" : "text-gray-800"
                }`}
              >
                {dailyPoints > 0 ? "+" : ""}
                {dailyPoints}
              </div>
              {tierInfo.label && (
                <div className={`text-sm font-semibold ${tierInfo.color}`}>{tierInfo.label}</div>
              )}
            </div>
          </div>
        </div>

        {childTasks.length === 0 ? (
          <p className="text-center text-gray-500 py-10">
            Aucune tâche assignée pour l&apos;instant.
          </p>
        ) : (
          <TaskBoard
            size="large"
            tasks={childTasks}
            isDone={(taskId) => isTaskCompleted(child.id, taskId)}
            onMove={(taskId, toDone) => {
              if (isTaskCompleted(child.id, taskId) === toDone) return;
              toggleTaskCompletion(child.id, taskId);
              if (toDone) celebrate({ sound: soundEnabled });
            }}
          />
        )}

        {availableRewards.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold text-green-700 mb-2 flex items-center gap-2">
              <Trophy size={18} />
              Récompenses débloquées :
            </h3>
            <div className="flex flex-wrap gap-2">
              {availableRewards.map((reward) => (
                <div
                  key={reward.id}
                  className="bg-green-50 border border-green-200 px-4 py-2 rounded-lg text-green-800"
                >
                  🎁 {reward.name} ({reward.points} pts)
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
};

export default ChildFocusPage;
