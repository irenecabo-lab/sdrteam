import type { DailyActivity } from "@/lib/types";
import type { TeamId } from "@/config/owners.config";
import { ownerById, ownersByTeam, teamDailyTarget } from "@/config/owners.config";
import { ACTIVITY_COMPLETION_CAP, ACTIVITY_WEIGHTS } from "@/config/scoring.config";
import { competitionDates, isWithinCompetitionWindow } from "@/lib/date";

export interface TeamActivityTotals {
  calls: number;
  talkTimeMinutes: number;
  meetingsBooked: number; // filled in by the caller from meetings data, see aggregate.ts
}

export interface TeamActivityResult {
  totals: TeamActivityTotals;
  target: TeamActivityTotals;
  completionPct: { calls: number; talkTimeMinutes: number; meetingsBooked: number };
  points: number;
}

export function sumDailyActivity(records: DailyActivity[], team: TeamId, meetingsBookedByOwner: Map<string, number>) {
  const owners = new Set(ownersByTeam(team).map((o) => o.ownerId));
  let calls = 0;
  let talkTimeMinutes = 0;
  for (const r of records) {
    if (!owners.has(r.ownerId)) continue;
    if (!isWithinCompetitionWindow(r.date)) continue;
    calls += r.calls;
    talkTimeMinutes += r.talkTimeMinutes;
  }
  let meetingsBooked = 0;
  for (const ownerId of owners) meetingsBooked += meetingsBookedByOwner.get(ownerId) ?? 0;
  return { calls, talkTimeMinutes, meetingsBooked };
}

export function scoreTeamActivity(totals: TeamActivityTotals, team: TeamId, numDays = competitionDates().length): TeamActivityResult {
  const dailyTarget = teamDailyTarget(team);
  const target: TeamActivityTotals = {
    calls: dailyTarget.calls * numDays,
    talkTimeMinutes: dailyTarget.talkTimeMinutes * numDays,
    meetingsBooked: dailyTarget.meetingsBooked * numDays,
  };

  const pct = (actual: number, goal: number) => (goal > 0 ? actual / goal : 0);
  const capped = (v: number) => Math.min(v, ACTIVITY_COMPLETION_CAP);

  const completionPct = {
    calls: Math.round(pct(totals.calls, target.calls) * 100),
    talkTimeMinutes: Math.round(pct(totals.talkTimeMinutes, target.talkTimeMinutes) * 100),
    meetingsBooked: Math.round(pct(totals.meetingsBooked, target.meetingsBooked) * 100),
  };

  const points =
    ACTIVITY_WEIGHTS.calls * capped(pct(totals.calls, target.calls)) +
    ACTIVITY_WEIGHTS.talkTimeMinutes * capped(pct(totals.talkTimeMinutes, target.talkTimeMinutes)) +
    ACTIVITY_WEIGHTS.meetingsBooked * capped(pct(totals.meetingsBooked, target.meetingsBooked));

  return { totals, target, completionPct, points: Math.round(points * 10) / 10 };
}
