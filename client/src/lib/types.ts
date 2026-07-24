/**
 * types.ts — Types et interfaces partagés de l'application.
 *
 * Déplacés depuis home.tsx sans aucune modification (pur découpage).
 */

export type ID = number;
export type ChallengeStatus = "active" | "success" | "failed";

export type ViewName =
  | "home"
  | "addChild"
  | "addTask"
  | "addDailyReward"
  | "addChallenge"
  | "addWeeklyReward"
  | "manageTasks"
  | "childFocus"
  | "history"
  | "weeklySummary"
  | "settings";

export type ViewState = {
  name: ViewName;
  payload: { childId?: ID };
};

export type Child = {
  id: ID;
  name: string;
  color: string;
  assignedTasks: ID[];
};

export type Task = {
  id: ID;
  name: string;
  // Valeur de la tâche (1 à 3). Absent = 1 : rétrocompatible avec les tâches
  // créées avant l'introduction des points variables.
  points?: number;
  // Pictogramme optionnel (clé stable du catalogue, ex. "teeth"). Sérialisable.
  // Rétrocompatible : les tâches existantes sans ce champ restent valides.
  icon?: string;
};

export type DailyReward = {
  id: ID;
  name: string;
  points: number;
  // Récompense réservée à un enfant. Absent = visible par tous les enfants
  // (comportement historique conservé).
  childId?: ID;
};

export type WeeklyReward = {
  id: ID;
  name: string;
  points: number;
  // Récompense réservée à un enfant. Absent = visible par tous les enfants.
  childId?: ID;
};

export type Challenge = {
  id: ID;
  name: string;
  pointsLost: number;
};

export type ChildDayData = {
  completedTasks: Record<ID, boolean>;
  activeChallenges: Record<ID, ChallengeStatus>;
  claimedWeeklyRewards: ID[];
};

// dailyData[dateKey][childId] = ChildDayData
export type DailyData = Record<string, Record<ID, ChildDayData>>;
