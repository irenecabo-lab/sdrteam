import { NextResponse } from "next/server";
import { readCachedSnapshot } from "@/lib/store";
import { getActiveProvider } from "@/lib/data/provider";
import { computeCompetitionState } from "@/lib/scoring/aggregate";
import { TEAMS, type TeamId } from "@/config/owners.config";

// Public, read-only summary for the published rules-landing page (a
// different origin - claude.ai artifacts - so this needs CORS enabled).
// No auth: same threat model as /battle itself, which is also unauthenticated
// in this phase. Only ever returns already-computed competition numbers.
export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

type PerSdrRow = ReturnType<typeof computeCompetitionState>["perSdr"][number];

const AWARD_DEFS: {
  key: keyof Pick<PerSdrRow, "calls" | "talkTimeMinutes" | "qualityCalls" | "meetingsBooked" | "meetingsHeld" | "biggestFleet" | "pipelineEur">;
  emoji: string;
  label: string;
  format: (v: number) => string;
}[] = [
  { key: "calls", emoji: "📞", label: "Más llamadas", format: (v) => `${v} llamadas` },
  { key: "talkTimeMinutes", emoji: "⏱", label: "Más minutos en conversación", format: (v) => `${v} min` },
  { key: "qualityCalls", emoji: "🔥", label: "Más llamadas de calidad (+3min)", format: (v) => `${v} llamadas` },
  { key: "meetingsBooked", emoji: "📅", label: "Más meetings agendadas", format: (v) => `${v} meetings` },
  { key: "meetingsHeld", emoji: "✅", label: "Más meetings celebradas", format: (v) => `${v} meetings` },
  { key: "biggestFleet", emoji: "🐘", label: "Mayor flota capturada", format: (v) => `${v} vehículos` },
  { key: "pipelineEur", emoji: "💰", label: "Más pipeline generado", format: (v) => `${v.toLocaleString("es-ES")} €` },
];

// One award per person, not one person sweeping every category: walks the
// metrics in order and, for each one, gives it to the highest scorer who
// doesn't already have an award - so it's each SDR's own standout stat, not
// just whoever happens to lead every single number.
function buildAwards(perSdr: PerSdrRow[]) {
  const alreadyAwarded = new Set<string>();
  const awards: { emoji: string; label: string; name: string; value: string }[] = [];

  for (const def of AWARD_DEFS) {
    const ranked = perSdr
      .filter((r) => (r[def.key] as number) > 0)
      .sort((a, b) => (b[def.key] as number) - (a[def.key] as number));
    const winner = ranked.find((r) => !alreadyAwarded.has(r.ownerId));
    if (!winner) continue;
    alreadyAwarded.add(winner.ownerId);
    awards.push({ emoji: def.emoji, label: def.label, name: winner.name, value: def.format(winner[def.key] as number) });
  }

  return awards;
}

export async function GET() {
  try {
    let snapshot = await readCachedSnapshot();
    if (!snapshot) {
      snapshot = await getActiveProvider().getSnapshot();
    }
    const state = computeCompetitionState(snapshot);

    const teamIds: TeamId[] = ["TEAM_1", "TEAM_2"];
    const winner: TeamId | null =
      state.teams.TEAM_1.totalPoints === state.teams.TEAM_2.totalPoints
        ? null
        : state.teams.TEAM_1.totalPoints > state.teams.TEAM_2.totalPoints
        ? "TEAM_1"
        : "TEAM_2";

    const teams = Object.fromEntries(
      teamIds.map((id) => [
        id,
        {
          name: TEAMS[id].name,
          nickname: TEAMS[id].nickname,
          color: TEAMS[id].color,
          totalPoints: state.teams[id].totalPoints,
        },
      ])
    );

    return NextResponse.json(
      {
        generatedAt: state.generatedAt,
        source: state.source,
        teams,
        winner,
        awards: buildAwards(state.perSdr),
      },
      { headers: CORS_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500, headers: CORS_HEADERS });
  }
}
