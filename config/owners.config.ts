// Owners participating in the Mapon Outbound Battle (22-30 Sept 2026).
// Owner IDs confirmed live against the HubSpot portal (25084478, EU1) on 15/9/26.
//
// Individual daily targets: Joel and Lidia use the team default. Irache's are
// different (confirmed by Marti on 15/9/26: 20 calls/day, 5 meetings/day on
// average). Her talk-time target was not given, so it falls back to the
// default for now - update DEFAULT_TARGETS or her own override below once
// she has a number.

export type TeamId = "TEAM_1" | "TEAM_2";

export interface DailyTarget {
  calls: number;
  talkTimeMinutes: number;
  meetingsBooked: number;
}

export interface Owner {
  ownerId: string; // HubSpot hubspot_owner_id
  name: string;
  team: TeamId;
  /** Overrides DEFAULT_TARGETS for this one SDR. Omit to use the default. */
  targetOverride?: Partial<DailyTarget>;
}

export const DEFAULT_TARGETS: DailyTarget = {
  calls: 60,
  talkTimeMinutes: 90,
  meetingsBooked: 2,
};

export const OWNERS: Owner[] = [
  { ownerId: "44080801", name: "Joel", team: "TEAM_1" },
  { ownerId: "33763722", name: "Lidia", team: "TEAM_1" },
  {
    ownerId: "30080243",
    name: "Irache",
    team: "TEAM_1",
    // [confirmed 15/9/26] 20 calls/day, 5 meetings/day on average.
    // talkTimeMinutes left at default until she gives us a number.
    targetOverride: { calls: 20, meetingsBooked: 5 },
  },
  { ownerId: "78282993", name: "Felipe", team: "TEAM_2" },
  { ownerId: "30080242", name: "Martina", team: "TEAM_2" },
];

export const TEAMS: Record<TeamId, { id: TeamId; name: string; nickname: string; color: string }> = {
  TEAM_1: { id: "TEAM_1", name: "TEAM 1", nickname: "Pipeline Hunters", color: "#2be3ff" },
  TEAM_2: { id: "TEAM_2", name: "TEAM 2", nickname: "Deal Makers", color: "#ff3d7f" },
};

export function ownerById(ownerId: string): Owner | undefined {
  return OWNERS.find((o) => o.ownerId === ownerId);
}

export function ownersByTeam(team: TeamId): Owner[] {
  return OWNERS.filter((o) => o.team === team);
}

export function targetFor(owner: Owner): DailyTarget {
  return { ...DEFAULT_TARGETS, ...owner.targetOverride };
}

/** Sum of individual daily targets for every active SDR on a team. */
export function teamDailyTarget(team: TeamId): DailyTarget {
  return ownersByTeam(team).reduce(
    (acc, o) => {
      const t = targetFor(o);
      return {
        calls: acc.calls + t.calls,
        talkTimeMinutes: acc.talkTimeMinutes + t.talkTimeMinutes,
        meetingsBooked: acc.meetingsBooked + t.meetingsBooked,
      };
    },
    { calls: 0, talkTimeMinutes: 0, meetingsBooked: 0 }
  );
}
