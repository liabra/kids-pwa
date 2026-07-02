import React, { useState, useEffect, useRef } from "react";
import type { ViewName } from "@/lib/types";
import { formatDate, getDayName, getWeekDates } from "@/lib/points";
import { AppStateProvider, useAppState } from "@/context/AppStateContext";
import PageShell from "@/components/PageShell";
import HistoryPage from "@/views/HistoryPage";
import WeeklySummaryPage from "@/views/WeeklySummaryPage";
import AddChildPage from "@/views/AddChildPage";
import AddTaskPage from "@/views/AddTaskPage";
import AddDailyRewardPage from "@/views/AddDailyRewardPage";
import AddChallengePage from "@/views/AddChallengePage";
import AddWeeklyRewardPage from "@/views/AddWeeklyRewardPage";
import ManageTasksPage from "@/views/ManageTasksPage";
import { isPinSet, setPin, verifyPin, resetAll } from "@/lib/parentLock";
import { exportAll, importAll } from "@/lib/db";
import {
  exportEncrypted,
  importEncrypted,
  suggestBackupFilename,
} from "@/lib/backup";
import {
  Plus,
  Trash2,
  Check,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Trophy,
  History,
  TrendingUp,
  Pencil,
  Lock,
  Unlock,
  Settings,
  Download,
  Upload,
} from "lucide-react";

/**
 * Modale de saisie du code PIN parent.
 *  - mode "set"    : premier réglage, demande le PIN + une confirmation.
 *  - mode "verify" : déverrouillage, demande le PIN une seule fois.
 */
const PinModal = ({
  mode,
  error,
  busy,
  onSubmit,
  onCancel,
}: {
  mode: "set" | "verify";
  error?: string;
  busy?: boolean;
  onSubmit: (pin: string) => void;
  onCancel: () => void;
}) => {
  const [pin, setPinValue] = useState("");
  const [confirm, setConfirm] = useState("");

  const isSet = mode === "set";
  const tooShort = pin.length < 4;
  const mismatch = isSet && confirm.length > 0 && pin !== confirm;
  const canSubmit = !busy && !tooShort && (!isSet || pin === confirm);

  const submit = () => {
    if (canSubmit) onSubmit(pin);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="text-purple-600" size={24} />
          <h3 className="text-xl font-bold text-gray-800">
            {isSet ? "Définir le code parent" : "Code parent"}
          </h3>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          {isSet
            ? "Choisis un code à 4 chiffres minimum. Il protège les réglages et la gestion. ⚠️ Il n'est pas récupérable en cas d'oubli."
            : "Saisis ton code pour accéder au mode parent."}
        </p>

        <input
          type="password"
          inputMode="numeric"
          autoFocus
          placeholder="Code PIN"
          value={pin}
          onChange={(e) => setPinValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !isSet && submit()}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3 text-center text-2xl tracking-widest"
        />

        {isSet && (
          <input
            type="password"
            inputMode="numeric"
            placeholder="Confirme le code"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3 text-center text-2xl tracking-widest"
          />
        )}

        {mismatch && (
          <div className="text-sm text-red-600 mb-2">Les deux codes ne correspondent pas.</div>
        )}
        {error && <div className="text-sm text-red-600 mb-2">{error}</div>}

        <div className="flex gap-2 mt-2">
          <button
            onClick={submit}
            disabled={!canSubmit}
            className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition disabled:opacity-50"
          >
            {busy ? "…" : isSet ? "Enregistrer" : "Déverrouiller"}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * AppShell — conteneur : consomme l'état applicatif via le contexte, GARDE toute
 * la logique de sécurité (mode parent, PIN, auto-verrouillage, garde-fou) et
 * rend le routeur. Les données et les helpers dérivés viennent du contexte.
 */
const AppShell = () => {
  // Données + helpers dérivés fournis par AppStateContext (aucun prop-drilling).
  const {
    children, tasks, dailyRewards, challenges, weeklyRewards,
    dataReady,
    currentDate, showSetup, setShowSetup,
    view, go, goHome,
    newChildName, setNewChildName, newChildColor, setNewChildColor,
    newTaskName, setNewTaskName,
    newRewardName, setNewRewardName, newRewardPoints, setNewRewardPoints,
    newChallengeName, setNewChallengeName, newChallengePoints, setNewChallengePoints,
    newWeeklyRewardName, setNewWeeklyRewardName, newWeeklyRewardPoints, setNewWeeklyRewardPoints,
    editingChildId, editingChildName, setEditingChildName,
    colors,
    goToPreviousDay, goToNextDay, goToToday, isToday,
    addChild, removeChild, startRenameChild, cancelRenameChild, saveRenameChild,
    addTask, removeTask, toggleTaskAssignment, clearAllAssignedTasksForChild,
    toggleTaskCompletion, isTaskCompleted,
    addChallenge, removeChallenge, activateChallenge, resolveChallenge, getActiveChallenges,
    addDailyReward, removeDailyReward, addWeeklyReward, removeWeeklyReward,
    clearAllTasks, clearAllDailyRewards, clearAllChallenges, clearAllWeeklyRewards,
    toggleWeeklyReward, isWeeklyRewardClaimed,
    getDailyPoints, getWeeklyPoints, getTierInfo,
    selectedChild,
  } = useAppState();

  // =========================
  // State: Verrou parent
  // =========================
  // L'app démarre en mode enfant (consultation + cocher les tâches). Le mode
  // parent est en mémoire uniquement : il reste actif jusqu'à un verrouillage
  // manuel OU un rechargement de l'app (choix documenté : on ne re-verrouille
  // PAS en revenant à l'accueil, pour ne pas gêner l'usage quotidien).
  const [parentMode, setParentMode] = useState(false);
  const [pinExists, setPinExists] = useState<boolean | null>(null);

  // Modale PIN : null = fermée. pending = action à exécuter après déverrouillage.
  const [pinPrompt, setPinPrompt] = useState<{
    mode: "set" | "verify";
    pending: (() => void) | null;
    error?: string;
    busy?: boolean;
  } | null>(null);

  // Au démarrage, on regarde si un PIN existe déjà sur cet appareil.
  useEffect(() => {
    isPinSet().then(setPinExists).catch(() => setPinExists(false));
  }, []);

  // Re-verrouillage automatique en arrière-plan (tablette partagée) : dès que
  // l'app est masquée (changement d'appli, écran éteint, onglet caché), on
  // repasse en mode enfant. On n'agit QUE si on était en mode parent, pour ne
  // pas perturber un enfant en train de consulter/cocher (données et saisie
  // enfant intactes ; le PIN reste requis pour re-déverrouiller ensuite).
  const parentModeRef = useRef(parentMode);
  parentModeRef.current = parentMode;
  useEffect(() => {
    const lockToChild = () => {
      if (!parentModeRef.current) return;
      setParentMode(false);
      goHome();
    };
    const onVisibility = () => {
      if (document.hidden) lockToChild();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", lockToChild);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", lockToChild);
    };
  }, []);

  // =========================
  // State: Sauvegarde / restauration chiffrée (étape 3)
  // =========================
  const [backupPass, setBackupPass] = useState("");
  const [backupPassConfirm, setBackupPassConfirm] = useState("");
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupMsg, setBackupMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restorePass, setRestorePass] = useState("");
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Demande l'accès parent puis exécute `action`. Si déjà déverrouillé, exécute
  // directement. Sinon ouvre la modale (réglage du PIN au tout premier usage,
  // ou simple vérification ensuite).
  const requireParent = (action: () => void = () => {}) => {
    if (parentMode) {
      action();
      return;
    }
    setPinPrompt({ mode: pinExists ? "verify" : "set", pending: action });
  };

  const handlePinSubmit = async (pin: string) => {
    if (!pinPrompt) return;
    setPinPrompt({ ...pinPrompt, busy: true, error: undefined });
    try {
      if (pinPrompt.mode === "set") {
        await setPin(pin);
        setPinExists(true);
      } else {
        const ok = await verifyPin(pin);
        if (!ok) {
          setPinPrompt({ ...pinPrompt, busy: false, error: "Code incorrect." });
          return;
        }
      }
      const pending = pinPrompt.pending;
      setParentMode(true);
      setPinPrompt(null);
      pending?.();
    } catch {
      setPinPrompt({
        ...pinPrompt,
        busy: false,
        error: "Une erreur est survenue. Réessaie.",
      });
    }
  };

  const lockParent = () => {
    setParentMode(false);
    goHome();
  };


  // =========================
  // Pages
  // =========================
  const renderHomePage = () => (
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
                        <h2 className="text-2xl font-bold" style={{ color: child.color }}>
                          {child.name}
                        </h2>

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
                    <div className="space-y-2">
                      {childTasks.map((task) => (
                        <label
                          key={task.id}
                          className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={isTaskCompleted(child.id, task.id)}
                            onChange={() => toggleTaskCompletion(child.id, task.id)}
                            className="w-5 h-5 text-green-500 rounded focus:ring-2 focus:ring-green-400"
                          />
                          <span
                            className={`text-sm ${
                              isTaskCompleted(child.id, task.id) ? "line-through text-gray-500" : "text-gray-800"
                            }`}
                          >
                            {task.name}
                          </span>
                        </label>
                      ))}
                    </div>
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
                  <span className="text-gray-800">{task.name}</span>
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

  const handleBackup = async () => {
    setBackupMsg(null);
    if (backupPass !== backupPassConfirm) {
      setBackupMsg({ ok: false, text: "Les deux phrases ne correspondent pas." });
      return;
    }
    setBackupBusy(true);
    try {
      const snapshot = await exportAll();
      const content = await exportEncrypted(snapshot, backupPass);
      const blob = new Blob([content], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = suggestBackupFilename();
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setBackupPass("");
      setBackupPassConfirm("");
      setBackupMsg({ ok: true, text: "Sauvegarde chiffrée téléchargée. 🔐" });
    } catch (e) {
      setBackupMsg({
        ok: false,
        text: e instanceof Error ? e.message : "Échec de la sauvegarde.",
      });
    } finally {
      setBackupBusy(false);
    }
  };

  const handleRestore = async () => {
    setRestoreMsg(null);
    if (!restoreFile) {
      setRestoreMsg({ ok: false, text: "Choisis d'abord un fichier de sauvegarde." });
      return;
    }
    if (!confirm("Restaurer remplacera TOUTES les données actuelles de cet appareil. Continuer ?")) {
      return;
    }
    setRestoreBusy(true);
    try {
      const content = await restoreFile.text();
      const snapshot = await importEncrypted<Record<string, unknown>>(content, restorePass);
      await importAll(snapshot);
      setRestoreMsg({ ok: true, text: "Restauration réussie. Rechargement…" });
      // Recharge l'app pour repartir des données restaurées.
      setTimeout(() => window.location.reload(), 600);
    } catch (e) {
      setRestoreMsg({
        ok: false,
        text: e instanceof Error ? e.message : "Échec de la restauration.",
      });
    } finally {
      setRestoreBusy(false);
    }
  };

  const handleResetAll = async () => {
    if (!confirm("⚠️ Tout effacer ? Cette action supprime DÉFINITIVEMENT toutes les données et le code parent. Elle est irréversible.")) return;
    if (!confirm("Dernière confirmation : effacer définitivement toutes les données ?")) return;
    try {
      await resetAll();
    } finally {
      // Rechargement complet pour repartir d'un état propre.
      window.location.reload();
    }
  };

  const renderSettingsPage = () => (
    <PageShell title="Réglages" onHome={goHome}>
      <div className="max-w-md mx-auto space-y-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-2">Mode parent</h3>
          <p className="text-sm text-gray-600 mb-4">
            Tu es en mode parent. Verrouille pour revenir au mode enfant.
          </p>
          <button
            onClick={lockParent}
            className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition flex items-center justify-center gap-2"
          >
            <Lock size={18} /> Verrouiller (mode enfant)
          </button>
        </div>

        {/* Sauvegarde chiffrée */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
            <Download size={20} /> Sauvegarder
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            Crée un fichier <code>.champions</code> chiffré avec une phrase secrète.
            Le fichier reste sur ton appareil ; rien n'est envoyé à un serveur.
          </p>
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg p-3 mb-4">
            ⚠️ <strong>Note bien ta phrase secrète.</strong> Si tu la perds, la
            sauvegarde est <strong>définitivement irrécupérable</strong> : personne
            (nous compris) ne peut la déchiffrer. C'est le prix d'un vrai
            chiffrement de bout en bout.
          </div>
          <input
            type="password"
            placeholder="Phrase secrète (8 caractères min.)"
            value={backupPass}
            onChange={(e) => setBackupPass(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3"
          />
          <input
            type="password"
            placeholder="Confirme la phrase secrète"
            value={backupPassConfirm}
            onChange={(e) => setBackupPassConfirm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3"
          />
          {backupMsg && (
            <div className={`text-sm mb-3 ${backupMsg.ok ? "text-green-700" : "text-red-600"}`}>
              {backupMsg.text}
            </div>
          )}
          <button
            onClick={handleBackup}
            disabled={backupBusy || backupPass.length < 8}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Download size={18} /> {backupBusy ? "Chiffrement…" : "Télécharger la sauvegarde"}
          </button>
        </div>

        {/* Restauration chiffrée */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
            <Upload size={20} /> Restaurer
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Choisis un fichier <code>.champions</code> et saisis sa phrase secrète.
            La restauration <strong>remplace</strong> toutes les données actuelles.
          </p>
          <input
            type="file"
            accept=".champions,application/json"
            onChange={(e) => setRestoreFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm mb-3 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gray-200 file:text-gray-800 hover:file:bg-gray-300"
          />
          <input
            type="password"
            placeholder="Phrase secrète de la sauvegarde"
            value={restorePass}
            onChange={(e) => setRestorePass(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3"
          />
          {restoreMsg && (
            <div className={`text-sm mb-3 ${restoreMsg.ok ? "text-green-700" : "text-red-600"}`}>
              {restoreMsg.text}
            </div>
          )}
          <button
            onClick={handleRestore}
            disabled={restoreBusy || !restoreFile}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Upload size={18} /> {restoreBusy ? "Déchiffrement…" : "Restaurer depuis un fichier"}
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-red-200">
          <h3 className="text-lg font-bold text-red-700 mb-2">Zone dangereuse</h3>
          <p className="text-sm text-gray-600 mb-4">
            Réinitialiser efface toutes les données (enfants, tâches, points…) et
            le code parent. C'est le seul recours en cas d'oubli du code, et c'est
            <strong> irréversible</strong>.
          </p>
          <button
            onClick={handleResetAll}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2"
          >
            <Trash2 size={18} /> Tout réinitialiser
          </button>
        </div>
      </div>
    </PageShell>
  );

  // =========================
  // Router switch
  // =========================
  if (!dataReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-red-400 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <div className="text-5xl mb-4 animate-bounce">⭐</div>
          <div className="text-xl font-semibold drop-shadow-lg">Chargement…</div>
        </div>
      </div>
    );
  }

  // Garde-fou : les vues sensibles ne s'affichent JAMAIS hors mode parent.
  // Défense en profondeur (en plus du masquage des boutons) : quelle que soit
  // la façon dont on quitte le mode parent (verrouillage manuel, auto-verrou en
  // arrière-plan…), on ne peut pas rester bloqué sur un écran de gestion.
  const PARENT_ONLY_VIEWS: ViewName[] = [
    "addChild",
    "addTask",
    "addDailyReward",
    "addChallenge",
    "addWeeklyReward",
    "manageTasks",
    "settings",
  ];
  const effectiveView: ViewName =
    !parentMode && PARENT_ONLY_VIEWS.includes(view.name) ? "home" : view.name;

  return (
    <>
      {effectiveView === "home" && renderHomePage()}
      {effectiveView === "addChild" && <AddChildPage />}
      {effectiveView === "addTask" && <AddTaskPage />}
      {effectiveView === "addDailyReward" && <AddDailyRewardPage />}
      {effectiveView === "addChallenge" && <AddChallengePage />}
      {effectiveView === "addWeeklyReward" && <AddWeeklyRewardPage />}
      {effectiveView === "manageTasks" && <ManageTasksPage />}
      {effectiveView === "history" && <HistoryPage />}
      {effectiveView === "weeklySummary" && <WeeklySummaryPage requireParent={requireParent} />}
      {effectiveView === "settings" && renderSettingsPage()}

      {pinPrompt && (
        <PinModal
          mode={pinPrompt.mode}
          error={pinPrompt.error}
          busy={pinPrompt.busy}
          onSubmit={handlePinSubmit}
          onCancel={() => setPinPrompt(null)}
        />
      )}
    </>
  );
};

/**
 * KidsTasksApp — conteneur mince : fournit l'état applicatif (Provider) puis rend
 * le shell (sécurité + routeur).
 */
const KidsTasksApp = () => (
  <AppStateProvider>
    <AppShell />
  </AppStateProvider>
);

export default KidsTasksApp;
