/**
 * PageShell — Cadre commun des écrans secondaires (barre "← Accueil" + titre).
 *
 * Déplacé depuis home.tsx sans modification.
 */
import React from "react";

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

export default PageShell;
