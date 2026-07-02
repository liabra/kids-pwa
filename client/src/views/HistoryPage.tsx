/**
 * HistoryPage — Historique hebdomadaire des points d'un enfant.
 *
 * Déplacé depuis home.tsx (renderHistoryPage) sans modification de comportement.
 * Consomme l'état via useAppState().
 */
import { Calendar } from "lucide-react";
import PageShell from "@/components/PageShell";
import { useAppState } from "@/context/AppStateContext";
import { formatDate, getDayName, getWeekDates } from "@/lib/points";

const HistoryPage = () => {
  const { selectedChild, goHome, goToToday, getDailyPoints, currentDate } = useAppState();

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

export default HistoryPage;
