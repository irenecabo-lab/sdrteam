// Scoring exclusions: real HubSpot-sourced activity that is deliberately
// kept OUT of the scoreboard for a given owner+day (e.g. Marti asking not to
// count her own points on a given day to balance out a lopsided
// competition). This never touches data/competition-data.json itself - the
// underlying record stays accurate - it only filters what feeds the scoring
// engine in lib/scoring/aggregate.ts.
export interface ScoringExclusion {
  ownerId: string;
  date: string; // YYYY-MM-DD, Europe/Madrid calendar day
  reason: string;
}

export const SCORING_EXCLUSIONS: ScoringExclusion[] = [
  // Pedida por Marti el 25/9/26: su actividad de hoy no debe sumar al
  // marcador, para no disparar aún más la ventaja de TEAM 2.
  { ownerId: "30080242", date: "2026-09-25", reason: "Marti pidió no contar su actividad de hoy" },
];

export function isScoringExcluded(ownerId: string, date: string): boolean {
  return SCORING_EXCLUSIONS.some((e) => e.ownerId === ownerId && e.date === date);
}
