import type { CompetitionSnapshot } from "@/lib/types";
import { OWNERS, ownerById, ownersByTeam, type TeamId } from "@/config/owners.config";
import { scoreStageTransitions, teamStageTransitionPoints } from "./stageTransitions";
import { scoreTeamActivity, sumDailyActivity } from "./activity";
import { scoreTeamBonuses, buildCaptureFeed, findBiggestCapture } from "./bonuses";
import { computeXp } from "./xp";
import { competitionDates, isWithinCompetitionWindow, timeLeft, toLocalDate, todayLocal } from "@/lib/date";
import { fleetTierFor } from "@/config/scoring.config";
import { isScoringExcluded } from "@/config/exclusions.config";
import { manualBonusesFor, manualBonusPointsFor } from "@/config/manualBonuses.config";

const TEAM_IDS: TeamId[] = ["TEAM_1", "TEAM_2"];

/**
 * Strips out any real activity/events that are deliberately excluded from
 * scoring for a given owner+day (config/exclusions.config.ts) - e.g. Marti
 * asking not to count her own points on a given day. The underlying
 * snapshot (and data/competition-data.json) is never touched by this; it
 * only affects what the scoring engine sees.
 */
function applyScoringExclusions(snapshot: CompetitionSnapshot): CompetitionSnapshot {
  return {
    ...snapshot,
    dailyActivity: snapshot.dailyActivity.filter((r) => !isScoringExcluded(r.ownerId, r.date)),
    dealStageEvents: snapshot.dealStageEvents.filter((e) => !isScoringExcluded(e.ownerId, toLocalDate(e.timestamp))),
    meetings: snapshot.meetings.filter((m) => !isScoringExcluded(m.ownerId, toLocalDate(m.bookedAt))),
    pipelineDeals: snapshot.pipelineDeals.filter((d) => !isScoringExcluded(d.ownerId, toLocalDate(d.createdAt))),
  };
}

function meetingsBookedByOwner(snapshot: CompetitionSnapshot, dateFilter: (d: string) => boolean) {
  const map = new Map<string, number>();
  for (const m of snapshot.meetings) {
    const date = toLocalDate(m.bookedAt);
    if (!dateFilter(date)) continue;
    map.set(m.ownerId, (map.get(m.ownerId) ?? 0) + 1);
  }
  return map;
}

/** Scores every KPI + stage transitions + bonuses for the given slice of the snapshot. */
function scoreWindow(snapshot: CompetitionSnapshot, dateFilter: (d: string) => boolean, numDaysForTarget: number) {
  const dailyActivity = snapshot.dailyActivity.filter((r) => dateFilter(r.date));
  const dealStageEvents = snapshot.dealStageEvents.filter((e) => dateFilter(toLocalDate(e.timestamp)));
  const meetings = snapshot.meetings.filter((m) => dateFilter(toLocalDate(m.bookedAt)));
  const pipelineDeals = snapshot.pipelineDeals.filter((d) => dateFilter(toLocalDate(d.createdAt)));

  const scoredTransitions = scoreStageTransitions(dealStageEvents);
  const stagePoints = teamStageTransitionPoints(scoredTransitions);
  const bookedByOwner = meetingsBookedByOwner({ ...snapshot, meetings }, dateFilter);

  const teamPoints: Record<TeamId, number> = { TEAM_1: 0, TEAM_2: 0 };
  for (const team of TEAM_IDS) {
    const totals = sumDailyActivity(dailyActivity, team, bookedByOwner);
    const activity = scoreTeamActivity(totals, team, numDaysForTarget);
    const bonuses = scoreTeamBonuses(team, dailyActivity, meetings, pipelineDeals);
    teamPoints[team] = Math.round((stagePoints[team] + activity.points + bonuses.total) * 10) / 10;
  }
  return teamPoints;
}

export function computeCompetitionState(rawSnapshot: CompetitionSnapshot) {
  const snapshot = applyScoringExclusions(rawSnapshot);
  const fullWindow = (d: string) => isWithinCompetitionWindow(d);
  const numDays = competitionDates().length;

  const scoredTransitions = scoreStageTransitions(snapshot.dealStageEvents);
  const stagePoints = teamStageTransitionPoints(scoredTransitions);
  const bookedByOwnerFull = meetingsBookedByOwner(snapshot, fullWindow);

  const teams = Object.fromEntries(
    TEAM_IDS.map((team) => {
      const totals = sumDailyActivity(snapshot.dailyActivity, team, bookedByOwnerFull);
      const activity = scoreTeamActivity(totals, team, numDays);
      const bonuses = scoreTeamBonuses(team, snapshot.dailyActivity, snapshot.meetings, snapshot.pipelineDeals);
      const manualBonuses = manualBonusesFor(team);
      const manualBonusPoints = manualBonusPointsFor(team);
      const totalPoints = Math.round((stagePoints[team] + activity.points + bonuses.total + manualBonusPoints) * 10) / 10;
      const xpInfo = computeXp(totalPoints);

      const teamMeetings = snapshot.meetings.filter(
        (m) => ownersByTeam(team).some((o) => o.ownerId === m.ownerId) && isWithinCompetitionWindow(toLocalDate(m.bookedAt))
      );
      const meetingsHeld = teamMeetings.filter((m) => m.outcome === "COMPLETED").length;
      const biggestFleet = teamMeetings.reduce((max, m) => Math.max(max, m.fleetSize ?? 0), 0);

      return [
        team,
        {
          team,
          totals: { ...totals, meetingsHeld, biggestFleet, pipelineEur: bonuses.pipelineEur },
          stagePoints: stagePoints[team],
          activity,
          bonuses,
          manualBonuses,
          manualBonusPoints,
          totalPoints,
          ...xpInfo,
        },
      ];
    })
  ) as Record<TeamId, any>;

  const perSdr = OWNERS.map((owner) => {
    const activity = snapshot.dailyActivity.filter((r) => r.ownerId === owner.ownerId && isWithinCompetitionWindow(r.date));
    const meetings = snapshot.meetings.filter((m) => m.ownerId === owner.ownerId && isWithinCompetitionWindow(toLocalDate(m.bookedAt)));
    const pipeline = snapshot.pipelineDeals.filter((d) => d.ownerId === owner.ownerId && isWithinCompetitionWindow(toLocalDate(d.createdAt)));
    return {
      ownerId: owner.ownerId,
      name: owner.name,
      team: owner.team,
      calls: activity.reduce((s, r) => s + r.calls, 0),
      talkTimeMinutes: activity.reduce((s, r) => s + r.talkTimeMinutes, 0),
      qualityCalls: activity.reduce((s, r) => s + r.qualityCalls, 0),
      meetingsBooked: meetings.length,
      meetingsHeld: meetings.filter((m) => m.outcome === "COMPLETED").length,
      biggestFleet: meetings.reduce((max, m) => Math.max(max, m.fleetSize ?? 0), 0),
      pipelineEur: pipeline.reduce((s, d) => s + d.amountEur, 0),
    };
  });

  const today = todayLocal();
  const todayPoints = scoreWindow(snapshot, (d) => d === today, 1);
  const todayWinner: TeamId | null =
    todayPoints.TEAM_1 === todayPoints.TEAM_2 ? null : todayPoints.TEAM_1 > todayPoints.TEAM_2 ? "TEAM_1" : "TEAM_2";

  const battleHistory = competitionDates()
    .filter((d) => d <= today)
    .map((date) => ({ date, teamPoints: scoreWindow(snapshot, (d) => d === date, 1) }));

  const captureFeed = buildCaptureFeed(snapshot.meetings);
  const biggestCapture = findBiggestCapture(snapshot.meetings);

  return {
    generatedAt: snapshot.generatedAt,
    source: snapshot.source,
    teams,
    perSdr,
    todayBattle: { date: today, teamPoints: todayPoints, winner: todayWinner },
    battleHistory,
    captureFeed,
    biggestCapture,
    timeLeft: timeLeft(),
    fleetTierFor,
  };
}

export type CompetitionState = ReturnType<typeof computeCompetitionState>;
