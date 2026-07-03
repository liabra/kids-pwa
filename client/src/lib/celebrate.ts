/**
 * celebrate.ts — Point d'entrée unique de la célébration d'une réussite.
 *
 * Combine le carillon (si le son est activé) et les confettis (qui gèrent
 * eux-mêmes le respect de prefers-reduced-motion).
 */
import { playSuccessChime } from "./sound";
import { burstConfetti } from "./confetti";

export function celebrate(options: { sound: boolean }): void {
  if (options.sound) playSuccessChime();
  burstConfetti();
}
