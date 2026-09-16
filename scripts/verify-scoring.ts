// Quick sanity check for the scoring engine, run against the example
// fixture: `npm run verify:scoring`. Not a full test suite - just a fast way
// to catch an obviously broken config change (e.g. a stage ID typo, a
// points value that makes a team score negative) before deploying.
import { computeCompetitionState } from "../lib/scoring/aggregate";
import { ManualProvider } from "../lib/data/manual-provider";
import { TEAMS, type TeamId } from "../config/owners.config";

async function main() {
  const snapshot = await new ManualProvider().getSnapshot();
  const state = computeCompetitionState(snapshot);

  let failures = 0;
  const check = (label: string, ok: boolean) => {
    console.log(`${ok ? "✓" : "✗"} ${label}`);
    if (!ok) failures++;
  };

  const teamIds: TeamId[] = ["TEAM_1", "TEAM_2"];
  for (const teamId of teamIds) {
    const team = state.teams[teamId];
    console.log(
      `\n${TEAMS[teamId].name} (${TEAMS[teamId].nickname}): ${team.totalPoints} pts | stage ${team.stagePoints} + activity ${team.activity.points} + bonuses ${team.bonuses.total}`
    );
    check(`${teamId} totalPoints is a finite, non-negative number`, Number.isFinite(team.totalPoints) && team.totalPoints >= 0);
    check(`${teamId} stagePoints is a finite, non-negative number`, Number.isFinite(team.stagePoints) && team.stagePoints >= 0);
    check(
      `${teamId} totalPoints = stagePoints + activity.points + bonuses.total (rounded)`,
      Math.abs(team.totalPoints - (team.stagePoints + team.activity.points + team.bonuses.total)) < 0.11
    );
  }

  check("perSdr has one row per owner", state.perSdr.length === 5);
  // Empty is correct before the competition starts (today < startDate) - just
  // make sure it never includes a date outside the window when it isn't empty.
  check(
    "battleHistory entries (if any) fall within the competition window",
    state.battleHistory.every((h) => h.date >= "2026-09-22" && h.date <= "2026-09-30")
  );
  check("captureFeed is sorted newest first", state.captureFeed.every((item, i, arr) => i === 0 || new Date(arr[i - 1].timestamp) >= new Date(item.timestamp)));

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
