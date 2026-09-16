import type { DailyActivity, MeetingRecord, PipelineDeal } from "@/lib/types";
import type { TeamId } from "@/config/owners.config";
import { ownerById, ownersByTeam } from "@/config/owners.config";
import { BONUS_POINTS, FLEET_TIERS, PIPELINE_EUR_PER_POINT, TOCHA_BONUS_POINTS, TOCHA_MIN_FLEET_SIZE, fleetTierFor } from "@/config/scoring.config";
import { isWithinCompetitionWindow, toLocalDate } from "@/lib/date";

export interface TeamBonusBreakdown {
  qualityCallPoints: number;
  meetingHeldPoints: number;
  quickCapturePoints: number;
  fleetCapturePoints: number;
  tochaPoints: number;
  pipelinePoints: number;
  pipelineEur: number;
  total: number;
}

function inWindow(iso: string) {
  return isWithinCompetitionWindow(toLocalDate(iso));
}

export function scoreTeamBonuses(
  team: TeamId,
  dailyActivity: DailyActivity[],
  meetings: MeetingRecord[],
  pipelineDeals: PipelineDeal[]
): TeamBonusBreakdown {
  const owners = new Set(ownersByTeam(team).map((o) => o.ownerId));

  const qualityCalls = dailyActivity
    .filter((r) => owners.has(r.ownerId) && isWithinCompetitionWindow(r.date))
    .reduce((sum, r) => sum + r.qualityCalls, 0);

  const teamMeetings = meetings.filter((m) => owners.has(m.ownerId) && inWindow(m.bookedAt));

  const meetingHeldCount = teamMeetings.filter((m) => m.outcome === "COMPLETED").length;

  const quickCaptureCount = teamMeetings.filter((m) => m.outcome === "COMPLETED" && inWindow(m.meetingAt)).length;

  const fleetCapturePoints = teamMeetings.reduce((sum, m) => {
    if (m.fleetSize == null) return sum;
    const tier = fleetTierFor(m.fleetSize);
    return sum + (tier?.points ?? 0);
  }, 0);

  const tochaPoints = teamMeetings.filter((m) => (m.fleetSize ?? 0) >= TOCHA_MIN_FLEET_SIZE).length * TOCHA_BONUS_POINTS;

  const pipelineEur = pipelineDeals
    .filter((d) => owners.has(d.ownerId) && inWindow(d.createdAt))
    .reduce((sum, d) => sum + d.amountEur, 0);
  const pipelinePoints = Math.round(pipelineEur / PIPELINE_EUR_PER_POINT);

  const qualityCallPoints = qualityCalls * BONUS_POINTS.qualityCall;
  const meetingHeldPoints = meetingHeldCount * BONUS_POINTS.meetingHeld;
  const quickCapturePoints = quickCaptureCount * BONUS_POINTS.quickCapture;

  return {
    qualityCallPoints,
    meetingHeldPoints,
    quickCapturePoints,
    fleetCapturePoints,
    tochaPoints,
    pipelinePoints,
    pipelineEur,
    total: qualityCallPoints + meetingHeldPoints + quickCapturePoints + fleetCapturePoints + tochaPoints + pipelinePoints,
  };
}

export interface CaptureFeedItem {
  id: string;
  timestamp: string;
  team: TeamId;
  ownerName: string;
  emoji: string;
  text: string;
  points?: number;
}

export function buildCaptureFeed(meetings: MeetingRecord[]): CaptureFeedItem[] {
  const items: CaptureFeedItem[] = [];
  for (const m of meetings) {
    const owner = ownerById(m.ownerId);
    if (!owner || !inWindow(m.bookedAt)) continue;
    const tier = m.fleetSize != null ? fleetTierFor(m.fleetSize) : null;
    items.push({
      id: `${m.meetingId}-booked`,
      timestamp: m.bookedAt,
      team: owner.team,
      ownerName: owner.name,
      emoji: "📅",
      text: `${owner.name} agendó una meeting${m.companyName ? ` con ${m.companyName}` : ""}${
        m.fleetSize != null ? ` (${m.fleetSize} vehículos)` : ""
      }`,
      points: tier?.points,
    });
    if ((m.fleetSize ?? 0) >= TOCHA_MIN_FLEET_SIZE) {
      items.push({
        id: `${m.meetingId}-tocha`,
        timestamp: m.bookedAt,
        team: owner.team,
        ownerName: owner.name,
        emoji: "🐉",
        text: `BOOST POR EMPRESAS TOCHAS: ${owner.name} lo activó con ${m.companyName || "una cuenta"}`,
        points: TOCHA_BONUS_POINTS,
      });
    }
    if (m.outcome === "COMPLETED" && inWindow(m.meetingAt)) {
      items.push({
        id: `${m.meetingId}-quickcapture`,
        timestamp: m.meetingAt,
        team: owner.team,
        ownerName: owner.name,
        emoji: "⚡",
        text: `QUICK CAPTURE: ${owner.name} celebró la meeting en la misma semana`,
        points: BONUS_POINTS.quickCapture,
      });
    }
  }
  return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function findBiggestCapture(meetings: MeetingRecord[]) {
  const inScope = meetings.filter((m) => m.fleetSize != null && inWindow(m.bookedAt));
  if (inScope.length === 0) return null;
  const biggest = inScope.reduce((max, m) => ((m.fleetSize ?? 0) > (max.fleetSize ?? 0) ? m : max));
  const owner = ownerById(biggest.ownerId);
  return { meeting: biggest, ownerName: owner?.name ?? "?", team: owner?.team };
}

export { FLEET_TIERS };
