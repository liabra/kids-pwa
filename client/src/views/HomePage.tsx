/**
 * HomePage — Écran d'accueil : barre verrou, navigation, grille des enfants et
 * listes de gestion.
 *
 * Déplacé depuis home.tsx (renderHomePage) sans modification de comportement.
 * Données via useAppState() ; la logique de sécurité (parentMode, requireParent,
 * lockParent) reste détenue par le conteneur home.tsx et est reçue en props.
 */
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  TrendingUp,
  Plus,
  Check,
  Pencil,
  Trash2,
  History,
  Trophy,
  Lock,
  Unlock,
  Settings,
  Maximize2,
} from "lucide-react";
import { useAppState } from "@/context/AppStateContext";
import { getDayName } from "@/lib/points";
import { celebrate } from "@/lib/celebrate";
import TaskIcon from "@/components/TaskIcon";
import TaskBoard from "@/components/TaskBoard";

const HomePage = ({
  parentMode,
  requireParent,
  lockParent,
}: {
  parentMode: boolean;
  requireParent: (action?: () => void) => void;
  lockParent: () => void;
}) => {
  const {
    children, tasks, dailyRewards, challenges, weeklyRewards,
    currentDate, showSetup, setShowSetup,
    go,
    editingChildId, editingChildName, setEditingChildName,
    goToPreviousDay, goToNextDay, goToToday, isToday,
    removeChild, startRenameChild, cancelRenameChild, saveRenameChild,
    removeTask, clearAllAssignedTasksForChild,
    toggleTaskCompletion, isTaskCompleted,
    removeChallenge, activateChallenge, resolveChallenge, getActiveChallenges,
    removeDailyReward, removeWeeklyReward,
    clearAllTasks, clearAllDailyRewards, clearAllChallenges, clearAllWeeklyRewards,
    getDailyPoints, getWeeklyPoints, getTierInfo,
    soundEnabled,
  } = useAppState();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-red-400 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Barre verrou parent */}
        <div className="flex justify-end mb-3">
          {parentMode ? (
            <div className="flex gap-2">
              <button
                onClick={() => go("settings")}
                className="px-4 py-2 bg-white/90 text-gray-800 rounded-full font-semibold hover:bg-white transition shadow flex items-center gap-2"
              >
                <Settings size={18} /> Réglages
              </button>
              <button
                onClick={lockParent}
                className="px-4 py-2 bg-white/90 text-gray-800 rounded-full font-semibold hover:bg-white transition shadow flex items-center gap-2"
              >
                <Lock size={18} /> Verrouiller
              </button>
            </div>
          ) : (
            <button
              onClick={() => requireParent()}
              className="px-4 py-2 bg-white/90 text-gray-800 rounded-full font-semibold hover:bg-white transition shadow flex items-center gap-2"
            >
              <Unlock size={18} /> Mode parent
            </button>
          )}
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-white text-center mb-8 drop-shadow-lg">
          ⭐ Tableau des Champions ⭐
        </h1>

        {/* Navigation temporelle */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
          <div className="flex items-center justify-between gap-4">
            <button onClick={goToPreviousDay} className="p-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition">
              <ChevronLeft size={24} />
            </button>

            <div className="text-center flex-1">
              <div className="text-2xl font-bold text-gray-800">{getDayName(currentDate)}</div>
              <div className="text-gray-600">
                {currentDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </div>
            </div>

            <button onClick={goToNextDay} className="p-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition">
              <ChevronRight size={24} />
            </button>
          </div>

          <div className="flex gap-2 mt-4 justify-center">
            {!isToday() && (
              <button
                onClick={goToToday}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-2"
              >
                <Calendar size={20} />
                Aujourd&apos;hui
              </button>
            )}
            <button
              onClick={() => go("weeklySummary")}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition flex items-center gap-2"
            >
              <TrendingUp size={20} />
              Résumé de la semaine
            </button>
          </div>
        </div>

        {/* Navigation rubriques (mode parent uniquement) */}
        {parentMode && (
          <div className="flex flex-wrap gap-3 justify-center mb-6">
            {children.length > 0 && (
              <button
                onClick={() => go("addChild")}
                className="px-6 py-3 bg-white text-purple-600 rounded-full font-semibold hover:bg-purple-50 transition shadow-lg flex items-center gap-2"
              >
                + Ajouter un autre enfant
              </button>
            )}

            <button
              onClick={() => setShowSetup((v) => !v)}
              className="px-6 py-3 bg-white text-gray-800 rounded-full font-semibold hover:bg-gray-50 transition shadow-lg"
            >
              {showSetup ? "Masquer la gestion" : "Gérer tâches / récompenses / défis"}
            </button>
          </div>
        )}

        {parentMode && showSetup && (
          <div className="flex flex-wrap gap-3 justify-center mb-6">
            <button
              onClick={() => go("addTask")}
              className="px-6 py-3 bg-white text-blue-600 rounded-full font-semibold hover:bg-blue-50 transition shadow-lg flex items-center gap-2"
            >
              <Plus size={20} />
              Ajouter une tâche
            </button>

            <button
              onClick={() => go("addDailyReward")}
              className="px-6 py-3 bg-white text-green-600 rounded-full font-semibold hover:bg-green-50 transition shadow-lg flex items-center gap-2"
            >
              <Plus size={20} />
              Récompense quotidienne
            </button>

            <button
              onClick={() => go("addChallenge")}
              className="px-6 py-3 bg-white text-orange-600 rounded-full font-semibold hover:bg-orange-50 transition shadow-lg flex items-center gap-2"
            >
              <Plus size={20} />
              Ajouter un défi
            </button>

            <button
              onClick={() => go("addWeeklyReward")}
              className="px-6 py-3 bg-white text-pink-600 rounded-full font-semibold hover:bg-pink-50 transition shadow-lg flex items-center gap-2"
            >
              <Plus size={20} />
              Récompense hebdomadaire
            </button>
          </div>
        )}

        {children.length === 0 && (
          <div className="bg-white/80 rounded-xl shadow-lg p-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">👋 Bienvenue dans Kids PWA</h2>
              <p className="text-gray-600">
                Commence par ajouter un enfant pour créer ses tâches, ses défis et suivre ses points jour après jour.
              </p>
            </div>

            <button
              onClick={() => requireParent(() => go("addChild"))}
              className="px-6 py-3 bg-purple-500 text-white rounded-full font-semibold hover:bg-purple-600 transition shadow-lg"
            >
              ➕ Ajouter un enfant
            </button>
          </div>
        )}


        {/* Grille des enfants (Home = toujours visible) */}
        {children.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {children.map((child) => {
            const dailyPoints = getDailyPoints(child.id, currentDate);
            const weeklyPoints = getWeeklyPoints(child.id);
            const tierInfo = getTierInfo(dailyPoints);
            const TierIcon = tierInfo.icon;
            const activeChallenges = getActiveChallenges(child.id);
            const childTasks = tasks.filter((task) => child.assignedTasks.includes(task.id));

            return (
              <div key={child.id} className="bg-white rounded-xl shadow-xl p-6 relative">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    {editingChildId === child.id ? (
                      <>
                        <input
                          value={editingChildName}
                          onChange={(e) => setEditingChildName(e.target.value)}
                          className="text-xl font-bold border-b-2 border-purple-400 focus:outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveRenameChild();
                            if (e.key === "Escape") cancelRenameChild();
                          }}
                        />

                        <button
                          onClick={saveRenameChild}
                          className="text-green-600 hover:text-green-800"
                          title="Valider"
                        >
                          <Check size={18} />
                        </button>

                        <button
                          onClick={cancelRenameChild}
                          className="text-gray-500 hover:text-gray-700"
                          title="Annuler"
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <>
                        {/* Toucher le prénom ouvre le tableau en grand format. */}
                        <button
                          onClick={() => go("childFocus", { childId: child.id })}
                          className="flex items-center gap-1 text-2xl font-bold hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 rounded"
                          style={{ color: child.color }}
                          title="Ouvrir en grand"
                        >
                          {child.name}
                          <Maximize2 size={18} className="opacity-60" />
                        </button>

                        {parentMode && (
                          <button
                            onClick={() => startRenameChild(child.id, child.name)}
                            className="text-gray-400 hover:text-purple-600 transition"
                            title="Renommer"
                          >
                            <Pencil size={18} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  {parentMode && (
                    <button onClick={() => removeChild(child.id)} className="text-red-500 hover:text-red-700 transition">
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-center gap-3 mb-4">
                  <TierIcon className={`${tierInfo.color} ${tierInfo.animation}`} size={40} />
                  <div className="text-center">
                    <div className={`text-4xl font-bold ${dailyPoints < 0 ? "text-red-600" : "text-gray-800"}`}>
                      {dailyPoints > 0 ? "+" : ""}
                      {dailyPoints}
                    </div>
                    {tierInfo.label && <div className={`text-sm font-semibold ${tierInfo.color}`}>{tierInfo.label}</div>}
                  </div>
                </div>

                <div className="bg-purple-100 rounded-lg p-3 mb-4 text-center">
                  <div className="text-sm text-purple-700 font-semibold">Total semaine</div>
                  <div className="text-2xl font-bold text-purple-900">
                    {weeklyPoints > 0 ? "+" : ""}
                    {weeklyPoints} pts
                  </div>
                </div>

                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => go("history", { childId: child.id })}
                    className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center justify-center gap-2 text-sm"
                  >
                    <History size={16} />
                    Historique
                  </button>
                  {parentMode && (
                    <button
                      onClick={() => go("manageTasks", { childId: child.id })}
                      className="flex-1 px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition text-sm"
                    >
                      Gérer les tâches
                    </button>
                  )}
                </div>

                {activeChallenges.length > 0 && (
                  <div className="mb-4">
                    <h3 className="font-semibold text-gray-700 mb-2 text-sm">Défis en cours:</h3>
                    {activeChallenges.map((challenge) => (
                      <div key={challenge.id} className="bg-orange-50 rounded-lg p-3 mb-2">
                        <div className="text-sm font-medium text-gray-800 mb-2">{challenge.name}</div>
                        {parentMode && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => resolveChallenge(child.id, challenge.id, true)}
                              className="flex-1 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition text-xs"
                            >
                              Réussi! (+1)
                            </button>
                            <button
                              onClick={() => resolveChallenge(child.id, challenge.id, false)}
                              className="flex-1 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition text-xs"
                            >
                              Réessayer (-{challenge.pointsLost})
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {childTasks.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-700 text-sm">
                        Tâches du jour :
                      </h3>

                      {parentMode && (
                        <button
                          onClick={() => clearAllAssignedTasksForChild(child.id)}
                          className="text-xs text-red-500 hover:text-red-700 font-semibold"
                        >
                          🗑️ Retirer toutes les tâches
                        </button>
                      )}
                    </div>
                    <TaskBoard
                      tasks={childTasks}
                      isDone={(taskId) => isTaskCompleted(child.id, taskId)}
                      onMove={(taskId, toDone) => {
                        // Garde-fou : ne rien faire si la colonne ne change pas.
                        if (isTaskCompleted(child.id, taskId) === toDone) return;
                        toggleTaskCompletion(child.id, taskId);
                        // On célèbre uniquement le passage "à faire" -> "fait".
                        if (toDone) celebrate({ sound: soundEnabled });
                      }}
                    />
                  </div>
                )}

                {/* Activer un défi (manual, jamais auto) — mode parent uniquement */}
                {parentMode && challenges.length > 0 && (
                  <div className="mb-4">
                    <h3 className="font-semibold text-gray-700 mb-2 text-sm">Activer un défi:</h3>
                    <div className="space-y-1">
                      {challenges.map((challenge) => (
                        <button
                          key={challenge.id}
                          onClick={() => activateChallenge(child.id, challenge.id)}
                          className="w-full text-left px-3 py-2 bg-yellow-50 hover:bg-yellow-100 rounded text-sm transition"
                        >
                          {challenge.name} (-{challenge.pointsLost} si raté)
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {dailyRewards.filter((r) => dailyPoints >= r.points).length > 0 && (
                  <div>
                    <h3 className="font-semibold text-green-700 mb-2 text-sm flex items-center gap-2">
                      <Trophy size={16} />
                      Récompenses disponibles:
                    </h3>
                    <div className="space-y-1">
                      {dailyRewards
                        .filter((r) => dailyPoints >= r.points)
                        .map((reward) => (
                          <div key={reward.id} className="bg-green-50 px-3 py-2 rounded text-sm text-green-800">
                            🎁 {reward.name} ({reward.points} pts)
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

        {/* Lists (restent sur Home pour contrôle global) — mode parent */}
        {parentMode && showSetup && (
          <>
        {tasks.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800">📋 Tâches disponibles</h2>
              <button
                onClick={clearAllTasks}
                className="px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition text-sm font-semibold flex items-center gap-2"
                title="Supprimer toutes les tâches"
              >
                <Trash2 size={16} />
                Tout supprimer
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
                  <span className="flex items-center gap-2 text-gray-800">
                    <TaskIcon iconKey={task.icon} size={18} />
                    {task.name}
                  </span>
                  <button onClick={() => removeTask(task.id)} className="text-red-500 hover:text-red-700 transition">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {dailyRewards.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800">🎁 Récompenses quotidiennes</h2>
              <button
                onClick={clearAllDailyRewards}
                className="px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition text-sm font-semibold flex items-center gap-2"
              >
                <Trash2 size={16} />
                Tout supprimer
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {dailyRewards.map((reward) => (
                <div key={reward.id} className="flex items-center justify-between bg-green-50 p-3 rounded-lg">
                  <span className="text-gray-800">
                    {reward.name} ({reward.points} pts)
                  </span>
                  <button onClick={() => removeDailyReward(reward.id)} className="text-red-500 hover:text-red-700 transition">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {challenges.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800">⚡ Défis</h2>
              <button
                onClick={clearAllChallenges}
                className="px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition text-sm font-semibold flex items-center gap-2"
              >
                <Trash2 size={16} />
                Tout supprimer
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {challenges.map((challenge) => (
                <div key={challenge.id} className="flex items-center justify-between bg-orange-50 p-3 rounded-lg">
                  <span className="text-gray-800">
                    {challenge.name} (-{challenge.pointsLost} pts)
                  </span>
                  <button onClick={() => removeChallenge(challenge.id)} className="text-red-500 hover:text-red-700 transition">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {weeklyRewards.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800">🏆 Récompenses hebdomadaires</h2>
              <button
                onClick={clearAllWeeklyRewards}
                className="px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition text-sm font-semibold flex items-center gap-2"
              >
                <Trash2 size={16} />
                Tout supprimer
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {weeklyRewards.map((reward) => (
                <div key={reward.id} className="flex items-center justify-between bg-purple-50 p-3 rounded-lg">
                  <span className="text-gray-800">
                    {reward.name} ({reward.points} pts/semaine)
                  </span>
                  <button onClick={() => removeWeeklyReward(reward.id)} className="text-red-500 hover:text-red-700 transition">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        </>
            )}
      </div>
    </div>
  );
};

export default HomePage;
