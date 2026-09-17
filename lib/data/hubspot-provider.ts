import type { CompetitionSnapshot, DailyActivity, DealStageEvent, MeetingRecord, PipelineDeal, DataProvider } from "@/lib/types";
import { OWNERS } from "@/config/owners.config";
import { SPAIN_PIPELINE_ID, STAGE_TRANSITION_STAGE_IDS } from "./hubspot-stage-ids";
import { COMPETITION, QUALITY_CALL_MIN_SECONDS, STAGE_TRANSITION_POINTS } from "@/config/scoring.config";
import { OUTBOUND_FILTER_PROPERTY, NEW_BUSINESS_FILTER_PROPERTY } from "@/config/hubspot-stages.config";

// Server-side only. Never import this file from a client component - the
// token must never reach the browser. Next.js route handlers and server
// components are the only callers.
const HUBSPOT_BASE = "https://api.hubapi.com";
const TOKEN = process.env.HUBSPOT_PRIVATE_APP_TOKEN;

// Required Private App scopes: crm.objects.calls.read, crm.objects.meetings.read,
// crm.objects.deals.read, crm.objects.companies.read, crm.objects.owners.read

function assertToken() {
  if (!TOKEN) {
    throw new Error(
      "HUBSPOT_PRIVATE_APP_TOKEN is not set. Add it to your environment before using DATA_SOURCE=hubspot."
    );
  }
}

async function hubspotFetch(path: string, init?: RequestInit) {
  assertToken();
  const res = await fetch(`${HUBSPOT_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    // Data only needs to be fresh twice a day - let the cron/manual refresh
    // decide when to re-fetch, not Next.js's own fetch cache.
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HubSpot API ${path} failed: ${res.status} ${res.statusText} - ${body}`);
  }
  return res.json();
}

async function searchAll(objectType: string, body: Record<string, unknown>, hardCap = 3000): Promise<any[]> {
  const results: any[] = [];
  let after: string | undefined;
  do {
    const page = await hubspotFetch(`/crm/v3/objects/${objectType}/search`, {
      method: "POST",
      body: JSON.stringify({ ...body, limit: 100, after }),
    });
    results.push(...(page.results ?? []));
    after = page.paging?.next?.after;
  } while (after && results.length < hardCap);
  return results;
}

async function batchRead(objectType: string, ids: string[], properties: string[]): Promise<any[]> {
  if (ids.length === 0) return [];
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += 100) chunks.push(ids.slice(i, i + 100));
  const pages = await Promise.all(
    chunks.map((chunk) =>
      hubspotFetch(`/crm/v3/objects/${objectType}/batch/read`, {
        method: "POST",
        body: JSON.stringify({ properties, inputs: chunk.map((id) => ({ id })) }),
      })
    )
  );
  return pages.flatMap((p) => p.results ?? []);
}

async function batchReadWithHistory(objectType: string, ids: string[], propertiesWithHistory: string[]): Promise<any[]> {
  if (ids.length === 0) return [];
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += 50) chunks.push(ids.slice(i, i + 50));
  const pages = await Promise.all(
    chunks.map((chunk) =>
      hubspotFetch(`/crm/v3/objects/${objectType}/batch/read`, {
        method: "POST",
        body: JSON.stringify({ propertiesWithHistory, inputs: chunk.map((id) => ({ id })) }),
      })
    )
  );
  return pages.flatMap((p) => p.results ?? []);
}

async function batchReadAssociations(fromType: string, toType: string, ids: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (ids.length === 0) return map;
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += 100) chunks.push(ids.slice(i, i + 100));
  await Promise.all(
    chunks.map(async (chunk) => {
      const page = await hubspotFetch(`/crm/v4/associations/${fromType}/${toType}/batch/read`, {
        method: "POST",
        body: JSON.stringify({ inputs: chunk.map((id) => ({ id })) }),
      });
      for (const r of page.results ?? []) {
        map.set(r.from.id, (r.to ?? []).map((t: any) => t.toObjectId));
      }
    })
  );
  return map;
}

function windowFilters() {
  const start = `${COMPETITION.startDate}T00:00:00.000Z`;
  const end = `${COMPETITION.endDate}T23:59:59.999Z`;
  return { start, end };
}

const ownerIds = OWNERS.map((o) => o.ownerId);

async function fetchCallsAsDailyActivity(): Promise<DailyActivity[]> {
  const { start, end } = windowFilters();
  const calls = await searchAll("calls", {
    filterGroups: [
      {
        filters: [
          { propertyName: "hubspot_owner_id", operator: "IN", values: ownerIds },
          { propertyName: "hs_timestamp", operator: "BETWEEN", value: start, highValue: end },
          { propertyName: "hs_call_direction", operator: "EQ", value: "OUTBOUND" },
        ],
      },
    ],
    properties: ["hubspot_owner_id", "hs_timestamp", "hs_call_duration"],
  });

  const byKey = new Map<string, DailyActivity>();
  for (const c of calls) {
    const ownerId = c.properties.hubspot_owner_id;
    const ts = c.properties.hs_timestamp;
    if (!ownerId || !ts) continue;
    const date = new Intl.DateTimeFormat("en-CA", { timeZone: COMPETITION.timezone }).format(new Date(ts)); // YYYY-MM-DD
    const key = `${ownerId}__${date}`;
    const durationMs = Number(c.properties.hs_call_duration ?? 0);
    const entry = byKey.get(key) ?? { ownerId, date, calls: 0, talkTimeMinutes: 0, qualityCalls: 0 };
    entry.calls += 1;
    entry.talkTimeMinutes += durationMs / 60000;
    if (durationMs / 1000 >= QUALITY_CALL_MIN_SECONDS) entry.qualityCalls += 1;
    byKey.set(key, entry);
  }
  return Array.from(byKey.values()).map((e) => ({ ...e, talkTimeMinutes: Math.round(e.talkTimeMinutes) }));
}

const DEAL_PROPERTIES = [
  "dealname",
  "amount_in_home_currency",
  "fleet_size",
  "hubspot_owner_id",
  "dealstage",
  "hs_createdate",
  "company_master_type",
  "lead_master_source",
  "hs_v2_date_entered_current_stage",
];

/**
 * The full set of outbound + new-business deals relevant to this
 * competition window: either created during the window (new leads entering
 * the pipe) OR whose CURRENT stage was entered during the window (an
 * existing/backlog deal that got worked and moved forward this week).
 *
 * Fixed 17/9/26 (1st pass): this used to be a single query requiring
 * hs_createdate BETWEEN the window, which only matched brand-new deals.
 * Confirmed with a real dry-run that day that Lidia (and presumably others)
 * routinely work OLD backlog deals (created months earlier) and bulk-move
 * them through "Attempting to contact" / "Conversation happening" etc. -
 * genuine outbound effort, not an edge case.
 *
 * Fixed 17/9/26 (2nd pass, same day): Marti reported a meeting she'd booked
 * wasn't showing up. Traced it to something much bigger than the first fix -
 * HubSpot auto-reassigns a deal from the SDR to an Account Executive the
 * moment it enters "Meeting scheduled" (confirmed: sampled every deal
 * currently sitting in that stage in the Spain pipeline, 12/12 were owned by
 * one of the two AEs, 0/12 by any of the 5 competition SDRs; Marti's own
 * "Virtón" and the earlier "Datacol Hispania" meeting both show the same
 * pattern, reassigned within minutes of the meeting being booked). The old
 * "owner IN ownerIds" filter on this second arm made that exact moment - the
 * deal crossing into Meeting scheduled - the same moment it fell out of
 * scope, so the single most valuable transition ("Meeting agendada", +10)
 * was structurally undetectable, and any meeting tied to that deal was
 * silently dropped by fetchMeetings(). This would have zeroed out real
 * meeting scoring for the whole 22-30/9 competition, not just an edge case.
 * Fix: drop the owner filter from this second arm entirely (pipeline +
 * outbound + new-business eligibility still apply) so a deal stays in scope
 * across the SDR-to-AE handoff. fetchStageTransitionEvents() below no longer
 * trusts the deal's CURRENT owner for attribution - it reads owner property
 * history and credits whoever actually owned the deal at the moment of each
 * transition, so broadening this arm doesn't mis-credit an AE.
 */
async function fetchDealsRelevantToWindow(): Promise<any[]> {
  const { start, end } = windowFilters();
  const eligibility: any[] = [{ propertyName: "pipeline", operator: "EQ", value: SPAIN_PIPELINE_ID }];
  if (OUTBOUND_FILTER_PROPERTY) {
    eligibility.push({ propertyName: OUTBOUND_FILTER_PROPERTY.property, operator: "EQ", value: OUTBOUND_FILTER_PROPERTY.outboundValue });
  }
  // Matches the team's own live "Outbound" HubSpot reports: excludes deals
  // on existing-client accounts (upsell/cross-sell), keeping only new-business.
  eligibility.push({ propertyName: NEW_BUSINESS_FILTER_PROPERTY.property, operator: "NEQ", value: NEW_BUSINESS_FILTER_PROPERTY.excludeValue });

  const ownerFilter = { propertyName: "hubspot_owner_id", operator: "IN", values: ownerIds };

  return searchAll("deals", {
    filterGroups: [
      // Arm 1: brand-new deal created in-window. Still SDR-owned at the
      // moment of creation (the AE handoff only happens later, at Meeting
      // scheduled), so keeping the owner filter here is safe and keeps this
      // arm narrow.
      { filters: [...eligibility, ownerFilter, { propertyName: "hs_createdate", operator: "BETWEEN", value: start, highValue: end }] },
      // Arm 2: existing/backlog deal that changed stage in-window. NO owner
      // filter - see comment above.
      { filters: [...eligibility, { propertyName: "hs_v2_date_entered_current_stage", operator: "BETWEEN", value: start, highValue: end }] },
    ],
    properties: DEAL_PROPERTIES,
  });
}

async function fetchStageTransitionEvents(dealIds: string[]): Promise<DealStageEvent[]> {
  // hubspot_owner_id is fetched WITH history alongside dealstage - see
  // fetchDealsRelevantToWindow()'s comment: a deal can move from SDR to AE
  // ownership partway through the window (routinely, right at Meeting
  // scheduled), so the deal's CURRENT owner is often no longer the SDR who
  // actually made a given transition happen. Each event below is credited to
  // whoever owned the deal AT THE MOMENT of that specific transition, not to
  // today's owner.
  const withHistory = await batchReadWithHistory("deals", dealIds, ["dealstage", "hubspot_owner_id"]);
  const validPairs = new Set(STAGE_TRANSITION_POINTS.map((p) => `${p.from}>${p.to}`));
  const { start, end } = windowFilters();
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();

  const events: DealStageEvent[] = [];
  for (const d of withHistory) {
    const history = d.propertiesWithHistory?.dealstage ?? [];
    const ownerHistory = [...(d.propertiesWithHistory?.hubspot_owner_id ?? [])].sort(
      (a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    // HubSpot returns history newest-first; sort oldest-first to walk transitions in order.
    const sorted = [...history].sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    for (let i = 1; i < sorted.length; i++) {
      const from = sorted[i - 1].value;
      const to = sorted[i].value;
      const ts = new Date(sorted[i].timestamp).getTime();
      if (!validPairs.has(`${from}>${to}`)) continue;
      if (ts < startMs || ts > endMs) continue;

      // Owner active at ts: the most recent owner-history entry at or before
      // this transition's timestamp; if every owner-history entry is somehow
      // after ts, fall back to the earliest known owner; if there's no owner
      // history at all, fall back to the deal's current owner.
      let ownerId = d.properties?.hubspot_owner_id ?? "";
      const priorOwnerEntries = ownerHistory.filter((o: any) => new Date(o.timestamp).getTime() <= ts);
      if (priorOwnerEntries.length > 0) {
        ownerId = priorOwnerEntries[priorOwnerEntries.length - 1].value;
      } else if (ownerHistory.length > 0) {
        ownerId = ownerHistory[0].value;
      }

      events.push({
        dealId: d.id,
        dealName: d.properties?.dealname ?? "",
        companyName: "", // filled in by caller once company associations are resolved
        ownerId,
        fromStageId: from,
        toStageId: to,
        timestamp: sorted[i].timestamp,
      });
    }
  }
  return events;
}

async function fetchMeetings(
  dealById: Map<string, any>,
  dealOwnerAtMeetingScheduled: Map<string, string>,
  companyNameByDealId: Map<string, string>
): Promise<MeetingRecord[]> {
  const { start, end } = windowFilters();
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();

  // Fixed 17/9/26 (3rd pass, same day): this used to search MEETINGS by
  // "owner IN ownerIds" first, then check whether the associated deal was
  // eligible. Marti's own "Skytex" meeting - booked by her today - broke
  // that: the meeting object itself came back owned by the Account
  // Executive (254777055), not her, even though the deal's own
  // Meeting-scheduled transition (per fetchStageTransitionEvents' owner
  // history) is clearly attributable to her. So the SDR-to-AE handoff
  // doesn't only move the DEAL's owner (fixed in the 2nd pass) - sometimes
  // the MEETING object itself gets created directly under the AE (e.g. when
  // it's booked through their calendar link). Searching meetings by SDR
  // owner missed this one entirely, same failure mode one level down.
  // Fix: stop trusting any owner field on the meeting search itself. Start
  // from the eligible deals (already broadened in fetchDealsRelevantToWindow
  // to survive the handoff) and pull their associated meetings directly, so
  // discovery no longer depends on who HubSpot happened to stamp as the
  // meeting's owner.
  const dealIds = Array.from(dealById.keys());
  const dealMeetingAssoc = await batchReadAssociations("deals", "meetings", dealIds);
  const meetingIdToDealId = new Map<string, string>();
  for (const [dealId, meetingIds] of dealMeetingAssoc.entries()) {
    for (const meetingId of meetingIds) {
      if (!meetingIdToDealId.has(meetingId)) meetingIdToDealId.set(meetingId, dealId);
    }
  }
  const allMeetingIds = Array.from(meetingIdToDealId.keys());
  const meetings = await batchRead("meetings", allMeetingIds, [
    "hubspot_owner_id",
    "hs_createdate",
    "hs_meeting_start_time",
    "hs_meeting_outcome",
  ]);

  // Filtered by hs_createdate (when the meeting was BOOKED), not
  // hs_meeting_start_time (when it's scheduled to happen). Confirmed
  // 16/9/26: lib/scoring/{aggregate,bonuses}.ts gate every meeting-derived
  // score (agendadas, meetingsHeld, fleet/TOCHA captures, quick capture) on
  // isWithinCompetitionWindow(bookedAt) - a meeting booked today for a date
  // weeks out still counts as today's outbound activity, while a meeting
  // booked weeks ago that merely happens to occur today does not (confirmed
  // again 17/9/26 against Marti's own "Skytex" and "Virtón" examples).
  return meetings
    .filter((m: any) => {
      const bookedMs = new Date(m.properties?.hs_createdate ?? 0).getTime();
      return bookedMs >= startMs && bookedMs <= endMs;
    })
    .map((m: any): MeetingRecord => {
      const dealId = meetingIdToDealId.get(m.id)!;
      const deal = dealById.get(dealId);
      // Credit whoever owned the deal AT THE MOMENT it entered Meeting
      // scheduled (from fetchStageTransitionEvents' owner-history walk) -
      // never the meeting's own owner field or the deal's current owner,
      // neither of which reliably points at the SDR who actually booked it.
      const ownerId =
        dealOwnerAtMeetingScheduled.get(dealId) ?? m.properties.hubspot_owner_id ?? deal?.properties?.hubspot_owner_id ?? "";
      return {
        meetingId: m.id,
        dealId,
        dealName: deal?.properties?.dealname ?? "",
        companyName: companyNameByDealId.get(dealId) ?? "",
        ownerId,
        bookedAt: m.properties.hs_createdate,
        meetingAt: m.properties.hs_meeting_start_time,
        outcome: (m.properties.hs_meeting_outcome ?? "SCHEDULED") as MeetingRecord["outcome"],
        fleetSize: deal?.properties?.fleet_size ? Number(deal.properties.fleet_size) : undefined,
      };
    });
}

export class HubSpotProvider implements DataProvider {
  async getSnapshot(): Promise<CompetitionSnapshot> {
    const deals = await fetchDealsRelevantToWindow();
    const dealById = new Map(deals.map((d: any) => [d.id, d]));
    const dealIds = deals.map((d: any) => d.id);

    const companyAssoc = await batchReadAssociations("deals", "companies", dealIds);
    const companyIds = Array.from(new Set(Array.from(companyAssoc.values()).flat()));
    const companies = await batchRead("companies", companyIds, ["name"]);
    const companyNameById = new Map(companies.map((c: any) => [c.id, c.properties?.name ?? ""]));
    const companyNameByDealId = new Map<string, string>();
    for (const [dealId, compIds] of companyAssoc.entries()) {
      companyNameByDealId.set(dealId, companyNameById.get(compIds[0]) ?? "");
    }

    // fetchMeetings needs the owner-history result of fetchStageTransitionEvents
    // (to attribute a meeting to whoever owned its deal at Meeting scheduled,
    // not to the meeting's own unreliable owner field - see fetchMeetings'
    // comment), so it can no longer run in the same Promise.all as that call.
    const [dailyActivity, stageEventsRaw] = await Promise.all([
      fetchCallsAsDailyActivity(),
      fetchStageTransitionEvents(dealIds),
    ]);

    const dealStageEvents = stageEventsRaw.map((e) => ({ ...e, companyName: companyNameByDealId.get(e.dealId) ?? "" }));

    const dealOwnerAtMeetingScheduled = new Map<string, string>();
    for (const e of dealStageEvents) {
      if (e.toStageId === STAGE_TRANSITION_STAGE_IDS.MEETING_SCHEDULED) {
        dealOwnerAtMeetingScheduled.set(e.dealId, e.ownerId);
      }
    }

    const meetings = await fetchMeetings(dealById, dealOwnerAtMeetingScheduled, companyNameByDealId);

    // "New company entered the outbound pipe" only makes sense for deals
    // actually CREATED during the window - unlike dealById/dealIds above,
    // this must stay narrow, or a backlog deal that merely moved stages this
    // week would wrongly count as a brand-new pipeline addition.
    const { start, end } = windowFilters();
    const startMs = new Date(start).getTime();
    const endMs = new Date(end).getTime();
    const pipelineDeals: PipelineDeal[] = deals
      .filter((d: any) => {
        const createdMs = new Date(d.properties?.hs_createdate ?? 0).getTime();
        return createdMs >= startMs && createdMs <= endMs;
      })
      .map((d: any) => ({
        dealId: d.id,
        dealName: d.properties?.dealname ?? "",
        companyName: companyNameByDealId.get(d.id) ?? "",
        ownerId: d.properties?.hubspot_owner_id ?? "",
        amountEur: Number(d.properties?.amount_in_home_currency ?? 0),
        createdAt: d.properties?.hs_createdate ?? "",
      }));

    return {
      generatedAt: new Date().toISOString(),
      source: "hubspot",
      dailyActivity,
      dealStageEvents,
      meetings,
      pipelineDeals,
    };
  }
}
