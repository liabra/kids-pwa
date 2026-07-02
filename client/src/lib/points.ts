/**
 * points.ts — Fonctions PURES de calcul (dates + points).
 *
 * Déplacées depuis home.tsx sans modification de logique. Aucun hook, aucun JSX.
 * Les fonctions de points reçoivent explicitement les données dont elles
 * dépendent (dailyData, challenges) au lieu de fermer sur l'état d'un composant.
 */

import type { Challenge, DailyData, ID } from "./types";

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

export const getDailyPoints = (
  dailyData: DailyData,
  challenges: Challenge[],
  childId: ID,
  date: Date,
): number => {
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

export const getWeeklyPoints = (
  dailyData: DailyData,
  challenges: Challenge[],
  childId: ID,
  currentDate: Date,
): number => {
  const weekDates = getWeekDates(currentDate);
  return weekDates.reduce(
    (acc, d) => acc + getDailyPoints(dailyData, challenges, childId, d),
    0,
  );
};
