import { readCachedSnapshot } from "@/lib/store";
import { getActiveProvider } from "@/lib/data/provider";
import { computeCompetitionState } from "@/lib/scoring/aggregate";
import BattleDashboard from "./BattleDashboard";

// Always render with the latest data - the snapshot itself only changes
// twice a day (see app/api/refresh/route.ts), but the "↻ Refresh Battle"
// button and Vercel cron both write through the same cache file, so this
// route should never serve a stale build-time snapshot.
export const dynamic = "force-dynamic";

export default async function BattlePage() {
  // Prefer the cached snapshot written by /api/refresh (cron or manual).
  // Fall back to a live pull only if nothing has been cached yet - e.g. the
  // very first request after a fresh deploy, before the first scheduled
  // refresh or a manual click has happened.
  let snapshot = await readCachedSnapshot();
  if (!snapshot) {
    snapshot = await getActiveProvider().getSnapshot();
  }

  const state = computeCompetitionState(snapshot);

  // fleetTierFor is a function reference - functions can't cross the
  // server -> client component boundary, so it's dropped here.
  // BattleDashboard imports it directly from the config instead.
  const { fleetTierFor: _fleetTierFor, ...clientState } = state;

  return <BattleDashboard state={clientState} />;
}
