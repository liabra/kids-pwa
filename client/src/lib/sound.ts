/**
 * sound.ts — Petit carillon de réussite, généré par l'API Web Audio.
 *
 * Aucun fichier audio, aucune dépendance, aucun réseau : les notes sont
 * synthétisées à la volée par des oscillateurs. Fonctionne hors-ligne.
 *
 * L'AudioContext est créé paresseusement et repris (resume) au moment du clic :
 * la politique d'autoplay des navigateurs autorise le son dans le cadre d'un
 * geste utilisateur (le tap sur la tâche en est un).
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC: typeof AudioContext | undefined =
    window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    try {
      ctx = new AC();
    } catch {
      return null;
    }
  }
  return ctx;
}

/**
 * Joue un petit carillon joyeux et court (~400 ms) : un arpège ascendant
 * Do–Mi–Sol. Ne fait rien si l'API Web Audio est indisponible.
 */
export function playSuccessChime(): void {
  const audio = getCtx();
  if (!audio) return;

  try {
    // Autorisé car appelé dans un geste utilisateur (tap sur la tâche).
    if (audio.state === "suspended") audio.resume().catch(() => {});

    const now = audio.currentTime;
    const notes = [523.25, 659.25, 783.99]; // Do5, Mi5, Sol5 (accord majeur, gai)
    const step = 0.13;

    const master = audio.createGain();
    master.gain.value = 0.18;
    master.connect(audio.destination);

    notes.forEach((freq, i) => {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;

      const start = now + i * step;
      const end = start + step + 0.08;

      // Petite enveloppe (attaque rapide, extinction douce) pour éviter les clics.
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(1, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);

      osc.connect(gain);
      gain.connect(master);
      osc.start(start);
      osc.stop(end + 0.02);
    });
  } catch {
    // Toute défaillance audio est silencieuse : le son est un bonus, pas un dû.
  }
}
