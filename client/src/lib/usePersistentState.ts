/**
 * usePersistentState.ts — Un useState qui se sauvegarde tout seul dans IndexedDB.
 *
 * Remplace, dans home.tsx, le motif actuel :
 *
 *   const [children, setChildren] = useState<Child[]>([]);
 *   // ... + un useEffect qui lit localStorage au démarrage
 *   // ... + un useEffect qui écrit dans localStorage à chaque changement
 *
 * par une seule ligne :
 *
 *   const [children, setChildren, ready] = usePersistentState<Child[]>("children", []);
 *
 * `ready` passe à true une fois les données chargées depuis le disque.
 * On peut afficher un écran de chargement tant que tout n'est pas prêt.
 */

import { useEffect, useRef, useState } from "react";
import * as db from "./db";

export function usePersistentState<T>(
  key: string,
  initialValue: T,
): [T, React.Dispatch<React.SetStateAction<T>>, boolean] {
  const [value, setValue] = useState<T>(initialValue);
  const [ready, setReady] = useState(false);

  // Empêche d'écrire la valeur par défaut PAR-DESSUS les vraies données
  // tant que le chargement initial depuis le disque n'est pas terminé.
  const loaded = useRef(false);

  // Chargement initial (asynchrone).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await db.get<T>(key);
        if (!cancelled && stored !== undefined) setValue(stored);
      } catch {
        // En cas d'erreur de lecture, on garde la valeur par défaut.
      } finally {
        if (!cancelled) {
          loaded.current = true;
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Sauvegarde à chaque changement, mais seulement après le chargement initial.
  useEffect(() => {
    if (!loaded.current) return;
    db.set(key, value).catch(() => {
      // Écriture échouée (disque plein, mode privé...) : on n'interrompt pas l'app.
    });
  }, [key, value]);

  return [value, setValue, ready];
}
