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
  // Confirmed 16/9/26: on Vercel's serverless functions the deployment
  // filesystem is effectively read-only (writeCachedSnapshot's fs.mkdir
  // throws ENOENT there), so the JSON snapshot cache in lib/store.ts cannot
  // be relied on to persist between requests/instances. For DATA_SOURCE=manual
  // that cache was never actually needed anyway - reading data/competition-data.json
  // straight off disk is instant and free - so this route now always pulls
  // live in manual mode, which also fixes the "Refresh Battle" button/stale
  // scoreboard bug that caching introduced. For DATA_SOURCE=hubspot the cache
  // is still worth trying first (it saves a live HubSpot API round trip), but
  // before that mode goes live for the 22nd, the cache itself should move to
  // something that actually persists on Vercel (Vercel KV/Blob, or a small
  // DB) - see lib/store.ts.
  const source = process.env.DATA_SOURCE ?? "manual";
  let snapshot = source === "manual" ? null : await readCachedSnapshot();
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
