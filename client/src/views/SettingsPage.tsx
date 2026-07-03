/**
 * SettingsPage — Réglages (verrouillage, sauvegarde/restauration chiffrée, reset).
 *
 * Déplacé depuis home.tsx sans modification de comportement. L'état et les
 * handlers de sauvegarde/restauration/réinitialisation (qui ne relèvent pas de la
 * logique PIN) vivent désormais dans ce composant. `lockParent` (sécurité) reste
 * détenu par home.tsx et est reçu en prop.
 */
import { useState } from "react";
import { Lock, Download, Upload, Trash2, Volume2, VolumeX } from "lucide-react";
import PageShell from "@/components/PageShell";
import { useAppState } from "@/context/AppStateContext";
import { exportAll, importAll } from "@/lib/db";
import {
  exportEncrypted,
  importEncrypted,
  suggestBackupFilename,
} from "@/lib/backup";
import { resetAll } from "@/lib/parentLock";

const SettingsPage = ({ lockParent }: { lockParent: () => void }) => {
  const { goHome, soundEnabled, setSoundEnabled } = useAppState();

  const [backupPass, setBackupPass] = useState("");
  const [backupPassConfirm, setBackupPassConfirm] = useState("");
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupMsg, setBackupMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restorePass, setRestorePass] = useState("");
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState<{ ok: boolean; text: string } | null>(null);

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

  return (
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

        {/* Sons */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-1 flex items-center gap-2">
                {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />} Sons
              </h3>
              <p className="text-sm text-gray-600">
                Petit carillon quand un enfant termine une tâche.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={soundEnabled}
              aria-label="Activer les sons"
              onClick={() => setSoundEnabled((v) => !v)}
              className={`relative shrink-0 w-14 h-8 rounded-full transition-colors ${
                soundEnabled ? "bg-green-500" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                  soundEnabled ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>
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
};

export default SettingsPage;
