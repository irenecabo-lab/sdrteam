import { XP_MULTIPLIER, levelFor } from "@/config/scoring.config";

export function computeXp(totalPoints: number) {
  const xp = Math.max(0, Math.round(totalPoints * XP_MULTIPLIER));
  const level = levelFor(xp);
  return { xp, ...level };
}
