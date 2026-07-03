/**
 * confetti.ts — Confettis « maison » sur un <canvas>, sans aucune dépendance.
 *
 * burstConfetti() superpose un canvas plein écran (pointer-events:none), anime
 * des rectangles colorés qui tombent en tournant pendant ~1,3 s, puis retire le
 * canvas et arrête la boucle (aucune fuite : requestAnimationFrame annulé,
 * écouteur resize retiré, élément supprimé du DOM).
 *
 * Accessibilité : si l'utilisateur a demandé « animations réduites »
 * (prefers-reduced-motion), on n'affiche rien.
 */

const COLORS = ["#f87171", "#fbbf24", "#34d399", "#60a5fa", "#c084fc", "#f472b6"];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rot: number;
  vr: number;
}

export function burstConfetti(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  // Respect de prefers-reduced-motion : pas d'animation.
  const reduce =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;

  const canvas = document.createElement("canvas");
  canvas.style.position = "fixed";
  canvas.style.inset = "0";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "9999";
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    return;
  }

  const dpr = window.devicePixelRatio || 1;
  let W = 0;
  let H = 0;
  const resize = () => {
    W = canvas.width = Math.floor(window.innerWidth * dpr);
    H = canvas.height = Math.floor(window.innerHeight * dpr);
  };
  resize();

  const N = 120;
  const parts: Particle[] = [];
  for (let i = 0; i < N; i++) {
    parts.push({
      x: Math.random() * W,
      y: -Math.random() * H * 0.3, // départ juste au-dessus / en haut de l'écran
      vx: (Math.random() - 0.5) * 6 * dpr,
      vy: (2 + Math.random() * 4) * dpr,
      size: (6 + Math.random() * 6) * dpr,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.3,
    });
  }

  const gravity = 0.15 * dpr;
  const duration = 1300; // ms
  const start = performance.now();
  let raf = 0;

  const cleanup = () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);
    canvas.remove();
  };

  const frame = (t: number) => {
    const elapsed = t - start;
    ctx.clearRect(0, 0, W, H);

    for (const p of parts) {
      p.vy += gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, 1 - elapsed / duration); // fondu en fin
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    }

    if (elapsed < duration) {
      raf = requestAnimationFrame(frame);
    } else {
      cleanup();
    }
  };

  window.addEventListener("resize", resize);
  raf = requestAnimationFrame(frame);
}
