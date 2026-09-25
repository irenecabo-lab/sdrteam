// Manual, one-off team bonuses that aren't earned from any HubSpot data -
// they're flat adjustments Marti hands out by hand (e.g. to balance out a
// lopsided competition). Kept in a separate file from scoring.config.ts and
// clearly labeled in the UI so it's always obvious which points came from
// real activity and which were a manual nudge.
import type { TeamId } from "./owners.config";

export interface ManualBonus {
  team: TeamId;
  points: number;
  label: string;
  addedOn: string; // YYYY-MM-DD, for the audit trail
}

export const MANUAL_TEAM_BONUSES: ManualBonus[] = [
  // Pedido por Marti el 25/9/26 para compensar el marcador, muy a favor de
  // TEAM 2 esos días.
  { team: "TEAM_1", points: 50, label: "Higiene del pipe impecable", addedOn: "2026-09-25" },
];

export function manualBonusesFor(team: TeamId): ManualBonus[] {
  return MANUAL_TEAM_BONUSES.filter((b) => b.team === team);
}

export function manualBonusPointsFor(team: TeamId): number {
  return manualBonusesFor(team).reduce((sum, b) => sum + b.points, 0);
}
