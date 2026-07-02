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
import HomePage from "@/views/HomePage";
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
      {effectiveView === "home" && (
        <HomePage parentMode={parentMode} requireParent={requireParent} lockParent={lockParent} />
      )}
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
