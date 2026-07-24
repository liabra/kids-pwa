/**
 * points.ts — Fonctions PURES de calcul (dates + points).
 *
 * Déplacées depuis home.tsx sans modification de logique. Aucun hook, aucun JSX.
 * Les fonctions de points reçoivent explicitement les données dont elles
 * dépendent (dailyData, challenges) au lieu de fermer sur l'état d'un composant.
 */

import type { Challenge, DailyData, DailyReward, ID, Task, WeeklyReward } from "./types";

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */

export const formatDate = (date: Date): string => date.toISOString().split("T")[0];

export const getDayName = (date: Date): string => {
  const days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  return days[date.getDay()];
};

export const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

export const getWeekDates = (date: Date): Date[] => {
  const weekStart = getWeekStart(date);
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    dates.push(d);
  }
  return dates;
};

/* ------------------------------------------------------------------ */
/* Points                                                              */
/* ------------------------------------------------------------------ */

/** Valeur d'une tâche. Absence de `points` = 1 (rétrocompatibilité). */
export const taskValue = (task?: Task): number => {
  const raw = task?.points;
  return typeof raw === "number" && Number.isFinite(raw) ? raw : 1;
};

/**
 * Récompenses visibles par un enfant : celles qui lui sont nommément
 * attribuées, plus celles qui n'ont pas de `childId` (communes).
 */
export const rewardsForChild = <T extends DailyReward | WeeklyReward>(
  rewards: T[],
  childId: ID,
): T[] => rewards.filter((r) => r.childId == null || r.childId === childId);

export const getDailyPoints = (
  dailyData: DailyData,
  tasks: Task[],
  challenges: Challenge[],
  childId: ID,
  date: Date,
): number => {
  const dateKey = formatDate(date);
  const childData = dailyData[dateKey]?.[childId];
  if (!childData) return 0;

  let points = 0;

  Object.entries(childData.completedTasks || {}).forEach(([taskId, completed]) => {
    if (!completed) return;
    points += taskValue(tasks.find((t) => t.id === Number(taskId)));
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

export const getWeeklyPoints = (
  dailyData: DailyData,
  tasks: Task[],
  challenges: Challenge[],
  childId: ID,
  currentDate: Date,
): number => {
  const weekDates = getWeekDates(currentDate);
  return weekDates.reduce(
    (acc, d) => acc + getDailyPoints(dailyData, tasks, challenges, childId, d),
    0,
  );
};
