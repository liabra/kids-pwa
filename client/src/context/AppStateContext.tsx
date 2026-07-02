/**
 * AppStateContext.tsx — État applicatif partagé (données + helpers dérivés).
 *
 * Fournit, via un Context React, les 6 états persistants (usePersistentState),
 * leurs setters, l'état de navigation/formulaires et tous les helpers dérivés
 * (CRUD, points, dates), pour éviter le prop-drilling entre les vues.
 *
 * IMPORTANT : ce module ne contient AUCUNE logique de sécurité (mode parent,
 * PIN, auto-verrouillage). Celle-ci reste dans le conteneur home.tsx.
 *
 * Code déplacé depuis home.tsx sans modification de comportement.
 */

import React, { createContext, useContext, useState, useMemo } from "react";
import { Flame, Sparkles, Star, Frown, Cloud, Zap } from "lucide-react";
import type {
  ID,
  ViewName,
  ViewState,
  Child,
  Task,
  DailyReward,
  WeeklyReward,
  Challenge,
  DailyData,
} from "@/lib/types";
import { usePersistentState } from "@/lib/usePersistentState";
import {
  formatDate,
  getWeekStart,
  getDailyPoints as computeDailyPoints,
  getWeeklyPoints as computeWeeklyPoints,
} from "@/lib/points";

function useAppStateValue() {
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
  // State: Navigation (pages)
  // =========================
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
  const [newTaskIcon, setNewTaskIcon] = useState("");

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
  // Date utils (helpers purs importés depuis lib/points)
  // =========================
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

    const newTask = { id: Date.now(), name: newTaskName.trim(), icon: newTaskIcon || undefined };
    setTasks((prev) => [...prev, newTask]);
    setNewTaskName("");
    setNewTaskIcon("");
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
  // Points (wrappers liés à l'état, autour des fonctions pures de lib/points)
  // =========================
  const getDailyPoints = (childId: ID, date: Date): number =>
    computeDailyPoints(dailyData, challenges, childId, date);

  const getWeeklyPoints = (childId: ID): number =>
    computeWeeklyPoints(dailyData, challenges, childId, currentDate);

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

  return {
    children, setChildren,
    tasks, setTasks,
    dailyRewards, setDailyRewards,
    challenges, setChallenges,
    weeklyRewards, setWeeklyRewards,
    dailyData, setDailyData,
    dataReady,
    currentDate, setCurrentDate,
    showSetup, setShowSetup,
    view, setView, go, goHome,
    newChildName, setNewChildName,
    newChildColor, setNewChildColor,
    newTaskName, setNewTaskName,
    newTaskIcon, setNewTaskIcon,
    newRewardName, setNewRewardName,
    newRewardPoints, setNewRewardPoints,
    newChallengeName, setNewChallengeName,
    newChallengePoints, setNewChallengePoints,
    newWeeklyRewardName, setNewWeeklyRewardName,
    newWeeklyRewardPoints, setNewWeeklyRewardPoints,
    editingChildId, setEditingChildId,
    editingChildName, setEditingChildName,
    colors,
    goToPreviousDay, goToNextDay, goToToday, isToday,
    addChild, removeChild, startRenameChild, cancelRenameChild, saveRenameChild,
    addTask, removeTask, toggleTaskAssignment, clearAllAssignedTasksForChild,
    ensureDailySlot, toggleTaskCompletion, isTaskCompleted, clearTodayCompletionsForChild,
    addChallenge, removeChallenge, activateChallenge, resolveChallenge, getActiveChallenges,
    addDailyReward, removeDailyReward, addWeeklyReward, removeWeeklyReward,
    clearAllTasks, clearAllDailyRewards, clearAllChallenges, clearAllWeeklyRewards,
    toggleWeeklyReward, isWeeklyRewardClaimed,
    getDailyPoints, getWeeklyPoints, getTierInfo,
    selectedChild,
  };
}

export type AppStateValue = ReturnType<typeof useAppStateValue>;

const AppStateContext = createContext<AppStateValue | null>(null);

export const AppStateProvider = ({ children }: { children: React.ReactNode }) => {
  const value = useAppStateValue();
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
};

export const useAppState = (): AppStateValue => {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState doit être utilisé dans un AppStateProvider");
  return ctx;
};
