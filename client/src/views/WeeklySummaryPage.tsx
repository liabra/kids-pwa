/**
 * WeeklySummaryPage — Résumé hebdomadaire (graphique + récompenses hebdo).
 *
 * Déplacé depuis home.tsx (renderWeeklySummaryPage) sans modification.
 * Données via useAppState() ; `requireParent` (logique de sécurité) reçu en prop
 * car il reste détenu par le conteneur home.tsx.
 */
import { Check } from "lucide-react";
import PageShell from "@/components/PageShell";
import { useAppState } from "@/context/AppStateContext";
import { formatDate, getDayName, getWeekDates } from "@/lib/points";

const WeeklySummaryPage = ({
  requireParent,
}: {
  requireParent: (action?: () => void) => void;
}) => {
  const {
    children,
    currentDate,
    getWeeklyRewardsForChild,
    goHome,
    getDailyPoints,
    getWeeklyPoints,
    isWeeklyRewardClaimed,
    toggleWeeklyReward,
  } = useAppState();

  return (
    <PageShell title="Résumé de la semaine" onHome={goHome}>
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-3xl font-bold mb-6 text-center">📊 Résumé de la semaine</h3>

        {children.length === 0 && <div className="text-center text-gray-600">Ajoute un enfant pour commencer 👶</div>}

        {children.map((child) => {
          const weekDates = getWeekDates(currentDate);
          const weeklyPoints = getWeeklyPoints(child.id);
          const availableRewards = getWeeklyRewardsForChild(child.id).filter(
            (r) => weeklyPoints >= r.points,
          );

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
};

export default WeeklySummaryPage;
