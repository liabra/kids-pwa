import React, { useState, useEffect, useMemo } from "react";
import { usePersistentState } from "@/lib/usePersistentState";
import { isPinSet, setPin, verifyPin, resetAll } from "@/lib/parentLock";
import { exportAll, importAll } from "@/lib/db";
import {
  exportEncrypted,
  importEncrypted,
  suggestBackupFilename,
} from "@/lib/backup";
import { Download, Upload } from "lucide-react";
import {
  Plus,
  Trash2,
  Check,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Trophy,
  Flame,
  Sparkles,
  Star,
  Frown,
  Cloud,
  Zap,
  History,
  TrendingUp,
  Pencil,
  Lock,
  Unlock,
  Settings,
} from "lucide-react";

  type ID = number;
  type ChallengeStatus = "active" | "success" | "failed";

  type ViewName =
    | "home"
    | "addChild"
    | "addTask"
    | "addDailyReward"
    | "addChallenge"
    | "addWeeklyReward"
    | "manageTasks"
    | "history"
    | "weeklySummary"
    | "settings";

  type ViewState = {
    name: ViewName;
    payload: { childId?: ID };
  };

  type Child = {
    id: ID;
    name: string;
    color: string;
    assignedTasks: ID[];
  };

  type Task = {
    id: ID;
    name: string;
  };

  type DailyReward = {
    id: ID;
    name: string;
    points: number;
  };

  type WeeklyReward = {
    id: ID;
    name: string;
    points: number;
  };

  type Challenge = {
    id: ID;
    name: string;
    pointsLost: number;
  };

  type ChildDayData = {
    completedTasks: Record<ID, boolean>;
    activeChallenges: Record<ID, ChallengeStatus>;
    claimedWeeklyRewards: ID[];
  };

  // dailyData[dateKey][childId] = ChildDayData
  type DailyData = Record<string, Record<ID, ChildDayData>>;

const PageShell = ({
  title,
  onHome,
  children,
}: {
  title: string;
  onHome: () => void;
  children: React.ReactNode;
}) => (
  <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-red-400 p-4">
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-4 mb-6 flex items-center justify-between gap-3">
        <button
          onClick={onHome}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
        >
          ← Accueil
        </button>

        <div className="text-center flex-1">
          <div className="text-xl md:text-2xl font-bold text-gray-800">{title}</div>
        </div>

        <div className="w-[96px]" />
      </div>

      {children}
    </div>
  </div>
);

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

const KidsTasksApp = () => {
  // =========================
  // State: Data
  // =========================
  // Données persistées automatiquement dans IndexedDB (clés identiques à
  // l'ancien localStorage). Le 3e élément `ready` indique que le chargement
  // initial depuis le disque est terminé.
  const [children, setChildren, childrenReady] = usePersistentState<Child[]>("children", []);
  const [tasks, setTasks, tasksReady] = usePersistentState<Task[]>("tasks", []);
  const [dailyRewards, setDailyRewards, dailyRewardsReady] = usePersistentState<DailyReward[]>("dailyRewards", []);
  const [challenges, setChallenges, challengesReady] = usePersistentState<Challenge[]>("challenges", []);
  const [weeklyRewards, setWeeklyRewards, weeklyRewardsReady] = usePersistentState<WeeklyReward[]>("weeklyRewards", []);
  const [dailyData, setDailyData, dailyDataReady] = usePersistentState<DailyData>("dailyData", {});

  // currentDate reste un état normal (ce n'est pas une donnée à persister).
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [showSetup, setShowSetup] = useState(false);

  // Tant que toutes les données ne sont pas chargées, on affiche un écran de
  // chargement pour éviter un flash d'état vide (puis l'écrasement du disque).
  const dataReady =
    childrenReady &&
    tasksReady &&
    dailyRewardsReady &&
    challengesReady &&
    weeklyRewardsReady &&
    dailyDataReady;

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
  // State: Navigation (pages)
  // =========================
  // view.name: 'home' | 'addChild' | 'addTask' | 'addDailyReward' | 'addChallenge' | 'addWeeklyReward' | 'manageTasks' | 'history' | 'weeklySummary'
  // view.payload: { childId?: number }
  const [view, setView] = useState<ViewState>({ name: "home", payload: {} });

  const go = (name: ViewName, payload: ViewState["payload"] = {}) =>
    setView({ name, payload });

  const goHome = () => setView({ name: "home", payload: {} });

  // =========================
  // State: Forms
  // =========================
  const [newChildName, setNewChildName] = useState("");
  const [newChildColor, setNewChildColor] = useState("#FF6B6B");

  const [newTaskName, setNewTaskName] = useState("");

  const [newRewardName, setNewRewardName] = useState("");
  const [newRewardPoints, setNewRewardPoints] = useState(5);

  const [newChallengeName, setNewChallengeName] = useState("");
  const [newChallengePoints, setNewChallengePoints] = useState(2);

  const [newWeeklyRewardName, setNewWeeklyRewardName] = useState("");
  const [newWeeklyRewardPoints, setNewWeeklyRewardPoints] = useState(20);

  const [editingChildId, setEditingChildId] = useState<number | null>(null);
  const [editingChildName, setEditingChildName] = useState<string>("");

  // Couleurs prédéfinies
  const colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#FFA07A",
    "#98D8C8",
    "#F7DC6F",
    "#BB8FCE",
    "#85C1E2",
  ];

  // La persistance est désormais automatique via usePersistentState
  // (chargement initial + écriture à chaque changement gérés par le hook).

  // =========================
  // Date utils
  // =========================
  const formatDate = (date: Date) => date.toISOString().split("T")[0];

  const getDayName = (date: Date) => {
    const days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
    return days[date.getDay()];
  };

  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const getWeekDates = (date: Date): Date[] => {
    const weekStart = getWeekStart(date);
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const goToPreviousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const goToToday = () => setCurrentDate(new Date());

  const isToday = () => {
    const today = new Date();
    return formatDate(currentDate) === formatDate(today);
  };

  // =========================
  // Children CRUD
  // =========================
  const addChild = () => {
    if (!newChildName.trim()) return;

    const newChild = {
      id: Date.now(),
      name: newChildName.trim(),
      color: newChildColor,
      assignedTasks: [],
      // ⚠️ Important: aucun défi n’est assigné automatiquement (conforme à ta règle)
    };

    setChildren((prev) => [...prev, newChild]);
    setNewChildName("");
    goHome();
  };

  const removeChild = (id: ID) => {
    if (confirm("Voulez-vous vraiment supprimer cet enfant ?")) {
      setChildren((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const startRenameChild = (childId: number, currentName: string) => {
    setEditingChildId(childId);
    setEditingChildName(currentName);
  };

  const cancelRenameChild = () => {
    setEditingChildId(null);
    setEditingChildName("");
  };

  const saveRenameChild = () => {
    if (editingChildId === null) return;

    const name = editingChildName.trim();
    if (!name) return; // option: tu peux afficher un petit message si vide

    setChildren((prev) =>
      prev.map((c) => (c.id === editingChildId ? { ...c, name } : c)),
    );

    cancelRenameChild();
  };


  // =========================
  // Tasks CRUD + assignment
  // =========================
  const addTask = () => {
    if (!newTaskName.trim()) return;

    const newTask = { id: Date.now(), name: newTaskName.trim() };
    setTasks((prev) => [...prev, newTask]);
    setNewTaskName("");
    goHome();
  };

  const removeTask = (id: ID) => {
    if (!confirm("Voulez-vous vraiment supprimer cette tâche ?")) return;

    setTasks((prev) => prev.filter((t) => t.id !== id));
    // retirer de tous les enfants
    setChildren((prev) =>
      prev.map((child) => ({
        ...child,
        assignedTasks: child.assignedTasks.filter((tid) => tid !== id),
      })),
    );
  };

  const toggleTaskAssignment = (childId: ID, taskId: ID) => {
    setChildren((prev) =>
      prev.map((child) => {
        if (child.id !== childId) return child;
        const isAssigned = child.assignedTasks.includes(taskId);
        return {
          ...child,
          assignedTasks: isAssigned
            ? child.assignedTasks.filter((tid) => tid !== taskId)
            : [...child.assignedTasks, taskId],
        };
      }),
    );
  };

  const clearAllAssignedTasksForChild = (childId: ID) => {
    if (!confirm("Retirer toutes les tâches assignées à cet enfant ?")) return;

    setChildren((prev) =>
      prev.map((child) =>
        child.id !== childId
          ? child
          : { ...child, assignedTasks: [] }
      )
    );
  };


  // =========================
  // Daily completion
  // =========================
  const ensureDailySlot = (data: DailyData, dateKey: string, childId: ID): DailyData => {
    const copy: DailyData = { ...data };

    if (!copy[dateKey]) copy[dateKey] = {};
    if (!copy[dateKey][childId]) {
      copy[dateKey][childId] = {
        completedTasks: {},
        activeChallenges: {},
        claimedWeeklyRewards: [],
      };
    }

    return copy;
  };

  const toggleTaskCompletion = (childId: ID, taskId: ID) => {
    const dateKey = formatDate(currentDate);
    let newDailyData = ensureDailySlot(dailyData, dateKey, childId);

    const isCompleted = newDailyData[dateKey][childId].completedTasks[taskId];
    newDailyData[dateKey][childId].completedTasks[taskId] = !isCompleted;

    setDailyData(newDailyData);
  };

  const isTaskCompleted = (childId: ID, taskId: ID): boolean => {
    const dateKey = formatDate(currentDate);
    return dailyData[dateKey]?.[childId]?.completedTasks?.[taskId] ?? false;
  };

  const clearTodayCompletionsForChild = (childId: ID) => {
    if (!confirm("Tout décocher pour aujourd’hui ?")) return;

    const dateKey = formatDate(currentDate);
    const newDailyData = ensureDailySlot(dailyData, dateKey, childId);

    newDailyData[dateKey][childId].completedTasks = {};
    setDailyData(newDailyData);
  };


  // =========================
  // Challenges CRUD + activation (manual only)
  // =========================
  const addChallenge = () => {
    if (!newChallengeName.trim()) return;

    const newChallenge = {
      id: Date.now(),
      name: newChallengeName.trim(),
      pointsLost: newChallengePoints,
    };

    setChallenges((prev) => [...prev, newChallenge]);

    // ✅ Conformité: aucun enfant n’est automatiquement impacté/assigné
    // L’activation se fait enfant par enfant via "Activer un défi".

    setNewChallengeName("");
    setNewChallengePoints(2);
    goHome();
  };

  const removeChallenge = (id: ID) => {
    if (!confirm("Voulez-vous vraiment supprimer ce défi ?")) return;
    setChallenges((prev) => prev.filter((c) => c.id !== id));
  };

  const activateChallenge = (childId: ID, challengeId: ID) => {
    const dateKey = formatDate(currentDate);
    let newDailyData = ensureDailySlot(dailyData, dateKey, childId);

    newDailyData[dateKey][childId].activeChallenges[challengeId] = "active";
    setDailyData(newDailyData);
  };

  const resolveChallenge = (childId: ID, challengeId: ID, success: boolean) => {
    const dateKey = formatDate(currentDate);
    let newDailyData = ensureDailySlot(dailyData, dateKey, childId);

    newDailyData[dateKey][childId].activeChallenges[challengeId] = success ? "success" : "failed";
    setDailyData(newDailyData);
  };

  const getActiveChallenges = (childId: ID): Challenge[] => {
    const dateKey = formatDate(currentDate);
    const childData = dailyData[dateKey]?.[childId];
    if (!childData) return [];

    return Object.entries(childData.activeChallenges || {})
      .filter(([, status]) => status === "active")
      .map(([challengeId]) => challenges.find((c) => c.id === Number(challengeId)))
      .filter((c): c is Challenge => Boolean(c));
  };

  // =========================
  // Rewards CRUD
  // =========================
  const addDailyReward = () => {
    if (!newRewardName.trim()) return;
    const newReward = { id: Date.now(), name: newRewardName.trim(), points: newRewardPoints };
    setDailyRewards((prev) => [...prev, newReward]);
    setNewRewardName("");
    setNewRewardPoints(5);
    goHome();
  };

  const removeDailyReward = (id: ID) => {
    if (!confirm("Voulez-vous vraiment supprimer cette récompense ?")) return;
    setDailyRewards((prev) => prev.filter((r) => r.id !== id));
  };

  const addWeeklyReward = () => {
    if (!newWeeklyRewardName.trim()) return;

    const newReward = { id: Date.now(), name: newWeeklyRewardName.trim(), points: newWeeklyRewardPoints };
    setWeeklyRewards((prev) => [...prev, newReward]);
    setNewWeeklyRewardName("");
    setNewWeeklyRewardPoints(20);
    goHome();
  };

  const removeWeeklyReward = (id: ID) => {
    if (!confirm("Voulez-vous vraiment supprimer cette récompense ?")) return;
    setWeeklyRewards((prev) => prev.filter((r) => r.id !== id));
  };

  const clearAllTasks = () => {
    if (!confirm("Supprimer TOUTES les tâches ?")) return;

    const allTaskIds = tasks.map(t => t.id);

    setTasks([]);

    // Retirer les tâches assignées chez tous les enfants
    setChildren(prev => prev.map(c => ({ ...c, assignedTasks: [] })));

    // Nettoyer dailyData.completedTasks partout
    setDailyData(prev => {
      const copy: DailyData = { ...prev };
      for (const dateKey of Object.keys(copy)) {
        for (const childIdStr of Object.keys(copy[dateKey])) {
          const childId = Number(childIdStr);
          const slot = copy[dateKey][childId];
          if (!slot?.completedTasks) continue;

          const newCompleted = { ...slot.completedTasks };
          for (const tid of allTaskIds) delete newCompleted[tid];
          copy[dateKey][childId] = { ...slot, completedTasks: newCompleted };
        }
      }
      return copy;
    });
  };

  const clearAllDailyRewards = () => {
    if (!confirm("Supprimer TOUTES les récompenses quotidiennes ?")) return;
    setDailyRewards([]);
  };

  const clearAllChallenges = () => {
    if (!confirm("Supprimer TOUS les défis ?")) return;

    const allChallengeIds = challenges.map(c => c.id);
    setChallenges([]);

    setDailyData(prev => {
      const copy: DailyData = { ...prev };
      for (const dateKey of Object.keys(copy)) {
        for (const childIdStr of Object.keys(copy[dateKey])) {
          const childId = Number(childIdStr);
          const slot = copy[dateKey][childId];
          if (!slot?.activeChallenges) continue;

          const newActive = { ...slot.activeChallenges };
          for (const cid of allChallengeIds) delete newActive[cid];
          copy[dateKey][childId] = { ...slot, activeChallenges: newActive };
        }
      }
      return copy;
    });
  };

  const clearAllWeeklyRewards = () => {
    if (!confirm("Supprimer TOUTES les récompenses hebdomadaires ?")) return;

    const allRewardIds = weeklyRewards.map(r => r.id);
    setWeeklyRewards([]);

    setDailyData(prev => {
      const copy: DailyData = { ...prev };
      for (const dateKey of Object.keys(copy)) {
        for (const childIdStr of Object.keys(copy[dateKey])) {
          const childId = Number(childIdStr);
          const slot = copy[dateKey][childId];
          if (!slot?.claimedWeeklyRewards?.length) continue;

          copy[dateKey][childId] = {
            ...slot,
            claimedWeeklyRewards: slot.claimedWeeklyRewards.filter(id => !allRewardIds.includes(id)),
          };
        }
      }
      return copy;
    });
  };


  const toggleWeeklyReward = (childId: ID, rewardId: ID) => {
    const weekStart = getWeekStart(currentDate);
    const weekKey = formatDate(weekStart);

    const newDailyData = ensureDailySlot(dailyData, weekKey, childId);
    const claimed = newDailyData[weekKey][childId].claimedWeeklyRewards || [];

    newDailyData[weekKey][childId].claimedWeeklyRewards = claimed.includes(rewardId)
      ? claimed.filter((id) => id !== rewardId)
      : [...claimed, rewardId];

    setDailyData(newDailyData);
  };

  const isWeeklyRewardClaimed = (childId: ID, rewardId: ID): boolean => {
    const weekStart = getWeekStart(currentDate);
    const weekKey = formatDate(weekStart);
    const claimed = dailyData[weekKey]?.[childId]?.claimedWeeklyRewards || [];
    return claimed.includes(rewardId);
  };

  // =========================
  // Points
  // =========================
  const getDailyPoints = (childId: ID, date: Date): number => {
    const dateKey = formatDate(date);
    const childData = dailyData[dateKey]?.[childId];
    if (!childData) return 0;

    let points = 0;

    Object.values(childData.completedTasks || {}).forEach((completed) => {
      if (completed) points += 1;
    });

    Object.entries(childData.activeChallenges || {}).forEach(([challengeId, status]) => {
      if (status === "success") points += 1;
      if (status === "failed") {
        const challenge = challenges.find((c) => c.id === Number(challengeId));
        if (challenge) points -= challenge.pointsLost;
      }
    });

    return points;
  };

  const getWeeklyPoints = (childId: ID): number => {
    const weekDates = getWeekDates(currentDate);
    return weekDates.reduce((acc, d) => acc + getDailyPoints(childId, d), 0);
  };

  const getTierInfo = (points: number) => {
    if (points >= 15) return { icon: Flame, color: "text-orange-500", label: "En feu!", animation: "animate-pulse" };
    if (points >= 10) return { icon: Sparkles, color: "text-purple-500", label: "Brillant!", animation: "animate-bounce" };
    if (points >= 5) return { icon: Star, color: "text-yellow-500", label: "Super!", animation: "" };
    if (points > 0) return { icon: Star, color: "text-blue-400", label: "", animation: "" };
    if (points === 0) return { icon: Star, color: "text-gray-400", label: "", animation: "" };
    if (points > -5) return { icon: Frown, color: "text-red-400", label: "Attention", animation: "" };
    if (points > -10) return { icon: Cloud, color: "text-gray-500", label: "Difficile", animation: "" };
    return { icon: Zap, color: "text-red-600", label: "Crise!", animation: "animate-pulse" };
  };

  // =========================
  // Helpers view data
  // =========================
  const selectedChild = useMemo(() => {
    const childId = view.payload?.childId;
    if (!childId) return null;
    return children.find((c) => c.id === childId) || null;
  }, [view, children]);

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

  const renderAddChildPage = () => (
    <PageShell title="Ajouter un enfant" onHome={goHome}>
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto">
        <h3 className="text-2xl font-bold mb-4">Nouvel enfant</h3>
        <input
          type="text"
          placeholder="Nom de l'enfant"
          value={newChildName}
          onChange={(e) => setNewChildName(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
          onKeyDown={(e) => e.key === "Enter" && addChild()}
        />
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2">Couleur:</label>
          <div className="grid grid-cols-4 gap-2">
            {colors.map((color) => (
              <button
                key={color}
                onClick={() => setNewChildColor(color)}
                className={`w-full h-12 rounded-lg border-4 transition ${
                  newChildColor === color ? "border-gray-800 scale-110" : "border-transparent"
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={addChild} className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition">
            Ajouter
          </button>
          <button
            onClick={() => {
              setNewChildName("");
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

  const renderAddTaskPage = () => (
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
        <div className="flex gap-2">
          <button onClick={addTask} className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
            Ajouter
          </button>
          <button
            onClick={() => {
              setNewTaskName("");
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

  const renderAddDailyRewardPage = () => (
    <PageShell title="Ajouter une récompense quotidienne" onHome={goHome}>
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto">
        <h3 className="text-2xl font-bold mb-4">Nouvelle récompense</h3>
        <input
          type="text"
          placeholder="Nom de la récompense"
          value={newRewardName}
          onChange={(e) => setNewRewardName(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
        />
        <input
          type="number"
          placeholder="Points requis"
          value={newRewardPoints}
          onChange={(e) => setNewRewardPoints(parseInt(e.target.value) || 0)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
        />
        <div className="flex gap-2">
          <button onClick={addDailyReward} className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition">
            Ajouter
          </button>
          <button
            onClick={() => {
              setNewRewardName("");
              setNewRewardPoints(5);
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

  const renderAddChallengePage = () => (
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

  const renderAddWeeklyRewardPage = () => (
    <PageShell title="Ajouter une récompense hebdomadaire" onHome={goHome}>
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto">
        <h3 className="text-2xl font-bold mb-4">Nouvelle récompense hebdo</h3>
        <input
          type="text"
          placeholder="Nom de la récompense"
          value={newWeeklyRewardName}
          onChange={(e) => setNewWeeklyRewardName(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
        />
        <input
          type="number"
          placeholder="Points requis (semaine)"
          value={newWeeklyRewardPoints}
          onChange={(e) => setNewWeeklyRewardPoints(parseInt(e.target.value) || 0)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
        />
        <div className="flex gap-2">
          <button onClick={addWeeklyReward} className="flex-1 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition">
            Ajouter
          </button>
          <button
            onClick={() => {
              setNewWeeklyRewardName("");
              setNewWeeklyRewardPoints(20);
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

  const renderManageTasksPage = () => {
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

  const renderHistoryPage = () => {
    if (!selectedChild) return <PageShell title="Historique" onHome={goHome}>Enfant introuvable.</PageShell>;

    return (
      <PageShell title={`Historique - ${selectedChild.name}`} onHome={goHome}>
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-md mx-auto">
          {/* ✅ Bouton Aujourd’hui pour l’historique */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={goToToday}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center justify-center gap-2"
            >
              <Calendar size={18} />
              Aujourd&apos;hui
            </button>
            <button
              onClick={goHome}
              className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
            >
              Fermer
            </button>
          </div>

          <div className="space-y-2">
            {getWeekDates(currentDate).map((date) => {
              const points = getDailyPoints(selectedChild.id, date);
              const isCurrentDate = formatDate(date) === formatDate(currentDate);
              const bgColor = points > 0 ? "bg-green-100" : points < 0 ? "bg-red-100" : "bg-gray-100";
              const textColor = points > 0 ? "text-green-800" : points < 0 ? "text-red-800" : "text-gray-600";

              return (
                <div
                  key={formatDate(date)}
                  className={`${bgColor} p-3 rounded-lg ${isCurrentDate ? "ring-2 ring-blue-500" : ""}`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-gray-800">
                        {getDayName(date)} {isCurrentDate && "(Sélectionné)"}
                      </div>
                      <div className="text-sm text-gray-600">{date.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</div>
                    </div>
                    <div className={`text-2xl font-bold ${textColor}`}>{points > 0 ? "+" : ""}{points}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </PageShell>
    );
  };

  const renderWeeklySummaryPage = () => (
    <PageShell title="Résumé de la semaine" onHome={goHome}>
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-3xl font-bold mb-6 text-center">📊 Résumé de la semaine</h3>

        {children.length === 0 && <div className="text-center text-gray-600">Ajoute un enfant pour commencer 👶</div>}

        {children.map((child) => {
          const weekDates = getWeekDates(currentDate);
          const weeklyPoints = getWeeklyPoints(child.id);
          const availableRewards = weeklyRewards.filter((r) => weeklyPoints >= r.points);

          return (
            <div key={child.id} className="mb-8 bg-gray-50 rounded-xl p-6">
              <h4 className="text-2xl font-bold mb-4" style={{ color: child.color }}>
                {child.name} - Total: {weeklyPoints > 0 ? "+" : ""}
                {weeklyPoints} pts
              </h4>

              <div className="bg-white rounded-lg p-4 mb-4">
                <div className="flex items-end justify-between gap-2 h-40">
                  {weekDates.map((date) => {
                    const points = getDailyPoints(child.id, date);
                    const maxPoints = 20;
                    const height = (Math.abs(points) / maxPoints) * 100;
                    const isPositive = points >= 0;

                    return (
                      <div key={formatDate(date)} className="flex-1 flex flex-col items-center">
                        <div className="flex-1 w-full flex flex-col justify-end">
                          <div
                            className={`w-full ${isPositive ? "bg-green-500" : "bg-red-500"} rounded-t transition-all`}
                            style={{ height: `${Math.min(height, 100)}%` }}
                          />
                        </div>
                        <div className="text-xs font-semibold mt-2 text-gray-700">{points > 0 ? "+" : ""}{points}</div>
                        <div className="text-xs text-gray-500 mt-1">{getDayName(date).slice(0, 3)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {availableRewards.length > 0 && (
                <div>
                  <h5 className="font-semibold text-gray-700 mb-2">🏆 Récompenses disponibles:</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {availableRewards.map((reward) => {
                      const isClaimed = isWeeklyRewardClaimed(child.id, reward.id);
                      return (
                        <button
                          key={reward.id}
                          onClick={() => requireParent(() => toggleWeeklyReward(child.id, reward.id))}
                          className={`p-3 rounded-lg transition ${
                            isClaimed
                              ? "bg-purple-200 text-purple-900 border-2 border-purple-500"
                              : "bg-purple-50 text-purple-700 hover:bg-purple-100"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{reward.name}</span>
                            <span className="text-sm">({reward.points} pts)</span>
                          </div>
                          {isClaimed && (
                            <div className="text-xs mt-1 flex items-center gap-1">
                              <Check size={12} /> Réclamée
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <button onClick={goHome} className="w-full px-4 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition font-semibold">
          Fermer
        </button>
      </div>
    </PageShell>
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

  return (
    <>
      {view.name === "home" && renderHomePage()}
      {view.name === "addChild" && renderAddChildPage()}
      {view.name === "addTask" && renderAddTaskPage()}
      {view.name === "addDailyReward" && renderAddDailyRewardPage()}
      {view.name === "addChallenge" && renderAddChallengePage()}
      {view.name === "addWeeklyReward" && renderAddWeeklyRewardPage()}
      {view.name === "manageTasks" && renderManageTasksPage()}
      {view.name === "history" && renderHistoryPage()}
      {view.name === "weeklySummary" && renderWeeklySummaryPage()}
      {view.name === "settings" && renderSettingsPage()}

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

export default KidsTasksApp;
