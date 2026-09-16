import { NextRequest, NextResponse } from "next/server";
import { getActiveProvider } from "@/lib/data/provider";
import { writeCachedSnapshot } from "@/lib/store";
import { currentLocalTime } from "@/lib/date";
import { REFRESH_TIMES_LOCAL } from "@/config/scoring.config";

export const dynamic = "force-dynamic";

// Called three ways:
//  - by the "↻ Refresh Battle" button in the UI, with ?manual=1 -> always runs.
//  - by a FREE EXTERNAL scheduler (e.g. cron-job.org) hitting this URL with
//    ?manual=1 twice a day, at 14:00 and 18:00 Europe/Madrid -> always runs.
//    This is the real trigger for the twice-daily pulls. See README.md for
//    why: Vercel's own Cron Jobs are capped at once/day on the free Hobby
//    plan (and only within a ±59min window even then), so they can't do two
//    precise daily pulls without upgrading to Pro - an external scheduler
//    sidesteps that limit entirely, for free.
//  - optionally by Vercel's own Cron Jobs (not configured by default - see
//    README.md to re-enable on a Pro plan) without ?manual=1 -> only
//    actually pulls when the current Europe/Madrid wall-clock time matches
//    one of REFRESH_TIMES_LOCAL exactly (14:00 / 18:00), so a more-frequent
//    cron tick can safely no-op the rest of the time without hardcoding a
//    UTC offset that would drift across Spain's DST changes.
export async function POST(req: NextRequest) {
  const manual = req.nextUrl.searchParams.get("manual") === "1";

  if (!manual) {
    const { hh, mm } = currentLocalTime();
    const nowLabel = `${hh}:${mm}`;
    if (!REFRESH_TIMES_LOCAL.includes(nowLabel)) {
      return NextResponse.json({ ok: true, skipped: true, reason: `not a scheduled refresh time (${nowLabel})` });
    }
  }

  try {
    const snapshot = await getActiveProvider().getSnapshot();
    await writeCachedSnapshot(snapshot);
    return NextResponse.json({ ok: true, generatedAt: snapshot.generatedAt, source: snapshot.source });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? String(err) }, { status: 500 });
  }
}

// Some free external schedulers only support GET pings - accept that too.
export async function GET(req: NextRequest) {
  return POST(req);
}
