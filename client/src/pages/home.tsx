import { useState, useEffect, useRef } from "react";
import type { ViewName } from "@/lib/types";
import { AppStateProvider, useAppState } from "@/context/AppStateContext";
import HistoryPage from "@/views/HistoryPage";
import WeeklySummaryPage from "@/views/WeeklySummaryPage";
import AddChildPage from "@/views/AddChildPage";
import AddTaskPage from "@/views/AddTaskPage";
import AddDailyRewardPage from "@/views/AddDailyRewardPage";
import AddChallengePage from "@/views/AddChallengePage";
import AddWeeklyRewardPage from "@/views/AddWeeklyRewardPage";
import ManageTasksPage from "@/views/ManageTasksPage";
import HomePage from "@/views/HomePage";
import ChildFocusPage from "@/views/ChildFocusPage";
import SettingsPage from "@/views/SettingsPage";
import { isPinSet, setPin, verifyPin } from "@/lib/parentLock";
import { Lock } from "lucide-react";

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
  // Le shell ne consomme du contexte que le strict nécessaire au routeur et à la
  // sécurité ; chaque vue lit elle-même l'état dont elle a besoin via useAppState.
  const { dataReady, view, goHome } = useAppState();

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
      {effectiveView === "childFocus" && <ChildFocusPage />}
      {effectiveView === "history" && <HistoryPage />}
      {effectiveView === "weeklySummary" && <WeeklySummaryPage requireParent={requireParent} />}
      {effectiveView === "settings" && <SettingsPage lockParent={lockParent} />}

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
