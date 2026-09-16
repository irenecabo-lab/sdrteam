import type { DealStageEvent } from "@/lib/types";
import type { TeamId } from "@/config/owners.config";
import { ownerById } from "@/config/owners.config";
import { STAGE_TRANSITION_POINTS } from "@/config/scoring.config";
import { isWithinCompetitionWindow, toLocalDate } from "@/lib/date";

export interface ScoredTransition {
  event: DealStageEvent;
  points: number;
  label: string;
  team: TeamId;
  date: string;
}

export function scoreStageTransitions(events: DealStageEvent[]): ScoredTransition[] {
  const out: ScoredTransition[] = [];
  for (const event of events) {
    const owner = ownerById(event.ownerId);
    if (!owner) continue;
    const date = toLocalDate(event.timestamp);
    if (!isWithinCompetitionWindow(date)) continue;
    const rule = STAGE_TRANSITION_POINTS.find((r) => r.from === event.fromStageId && r.to === event.toStageId);
    if (!rule) continue;
    out.push({ event, points: rule.points, label: rule.label, team: owner.team, date });
  }
  return out;
}

export function teamStageTransitionPoints(scored: ScoredTransition[]): Record<TeamId, number> {
  const totals: Record<TeamId, number> = { TEAM_1: 0, TEAM_2: 0 };
  for (const s of scored) totals[s.team] += s.points;
  return totals;
}
