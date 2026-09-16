import type { CompetitionSnapshot, DailyActivity, DealStageEvent, MeetingRecord, PipelineDeal, DataProvider } from "@/lib/types";
import { OWNERS } from "@/config/owners.config";
import { SPAIN_PIPELINE_ID } from "./hubspot-stage-ids";
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

async function fetchDealsInScope(): Promise<any[]> {
  const { start, end } = windowFilters();
  const filters: any[] = [
    { propertyName: "hubspot_owner_id", operator: "IN", values: ownerIds },
    { propertyName: "pipeline", operator: "EQ", value: SPAIN_PIPELINE_ID },
    { propertyName: "hs_createdate", operator: "BETWEEN", value: start, highValue: end },
  ];
  if (OUTBOUND_FILTER_PROPERTY) {
    filters.push({ propertyName: OUTBOUND_FILTER_PROPERTY.property, operator: "EQ", value: OUTBOUND_FILTER_PROPERTY.outboundValue });
  }
  // Matches the team's own live "Outbound" HubSpot reports: excludes deals
  // on existing-client accounts (upsell/cross-sell), keeping only new-business.
  filters.push({ propertyName: NEW_BUSINESS_FILTER_PROPERTY.property, operator: "NEQ", value: NEW_BUSINESS_FILTER_PROPERTY.excludeValue });
  return searchAll("deals", {
    filterGroups: [{ filters }],
    properties: ["dealname", "amount_in_home_currency", "fleet_size", "hubspot_owner_id", "dealstage", "hs_createdate", "company_master_type", "lead_master_source"],
  });
}

async function fetchStageTransitionEvents(dealIds: string[]): Promise<DealStageEvent[]> {
  const withHistory = await batchReadWithHistory("deals", dealIds, ["dealstage"]);
  const validPairs = new Set(STAGE_TRANSITION_POINTS.map((p) => `${p.from}>${p.to}`));
  const { start, end } = windowFilters();
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();

  const events: DealStageEvent[] = [];
  for (const d of withHistory) {
    const history = d.propertiesWithHistory?.dealstage ?? [];
    // HubSpot returns history newest-first; sort oldest-first to walk transitions in order.
    const sorted = [...history].sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    for (let i = 1; i < sorted.length; i++) {
      const from = sorted[i - 1].value;
      const to = sorted[i].value;
      const ts = new Date(sorted[i].timestamp).getTime();
      if (!validPairs.has(`${from}>${to}`)) continue;
      if (ts < startMs || ts > endMs) continue;
      events.push({
        dealId: d.id,
        dealName: d.properties?.dealname ?? "",
        companyName: "", // filled in by caller once company associations are resolved
        ownerId: d.properties?.hubspot_owner_id ?? "",
        fromStageId: from,
        toStageId: to,
        timestamp: sorted[i].timestamp,
      });
    }
  }
  return events;
}

async function fetchMeetings(dealById: Map<string, any>, companyNameByDealId: Map<string, string>): Promise<MeetingRecord[]> {
  const { start, end } = windowFilters();
  // Filtered by hs_createdate (when the meeting was BOOKED), not
  // hs_meeting_start_time (when it's scheduled to happen). Confirmed
  // 16/9/26: lib/scoring/{aggregate,bonuses}.ts gate every meeting-derived
  // score (agendadas, meetingsHeld, fleet/TOCHA captures, quick capture) on
  // isWithinCompetitionWindow(bookedAt) - a meeting booked today for a date
  // weeks out still counts as today's outbound activity, while a meeting
  // booked weeks ago that merely happens to occur today does not. Filtering
  // the HubSpot query itself by meeting start time (as this used to) pulled
  // the wrong set entirely - it missed meetings booked in-window but
  // scheduled for later, and pulled old meetings just because they landed
  // on today's calendar.
  const meetings = await searchAll("meetings", {
    filterGroups: [
      {
        filters: [
          { propertyName: "hubspot_owner_id", operator: "IN", values: ownerIds },
          { propertyName: "hs_createdate", operator: "BETWEEN", value: start, highValue: end },
        ],
      },
    ],
    properties: ["hubspot_owner_id", "hs_createdate", "hs_meeting_start_time", "hs_meeting_outcome"],
  });

  const meetingIds = meetings.map((m: any) => m.id);
  const dealAssoc = await batchReadAssociations("meetings", "deals", meetingIds);

  // Only a meeting tied to an outbound, new-business deal (i.e. a deal that
  // made it into `dealById`, which is already scoped by fetchDealsInScope's
  // lead_master_source + company_master_type filters) counts toward
  // "agendado"/meetings scoring and fleet/TOCHA captures. A meeting on an
  // inbound lead or an existing-client account still has its calls counted
  // elsewhere, but must not surface here - confirmed 16/9/26 after a manual
  // dry run showed most same-day meetings were actually inbound or
  // existing-client, not genuine outbound captures.
  return meetings
    .filter((m: any) => {
      const dealIds: string[] = dealAssoc.get(m.id) ?? [];
      return dealIds.some((id) => dealById.has(id));
    })
    .map((m: any): MeetingRecord => {
      const dealIds: string[] = dealAssoc.get(m.id) ?? [];
      const dealId = dealIds.find((id) => dealById.has(id))!;
      const deal = dealById.get(dealId);
      return {
        meetingId: m.id,
        dealId,
        dealName: deal?.properties?.dealname ?? "",
        companyName: companyNameByDealId.get(dealId) ?? "",
        ownerId: m.properties.hubspot_owner_id,
        bookedAt: m.properties.hs_createdate,
        meetingAt: m.properties.hs_meeting_start_time,
        outcome: (m.properties.hs_meeting_outcome ?? "SCHEDULED") as MeetingRecord["outcome"],
        fleetSize: deal?.properties?.fleet_size ? Number(deal.properties.fleet_size) : undefined,
      };
    });
}

export class HubSpotProvider implements DataProvider {
  async getSnapshot(): Promise<CompetitionSnapshot> {
    const deals = await fetchDealsInScope();
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

    const [dailyActivity, stageEventsRaw, meetings] = await Promise.all([
      fetchCallsAsDailyActivity(),
      fetchStageTransitionEvents(dealIds),
      fetchMeetings(dealById, companyNameByDealId),
    ]);

    const dealStageEvents = stageEventsRaw.map((e) => ({ ...e, companyName: companyNameByDealId.get(e.dealId) ?? "" }));

    const pipelineDeals: PipelineDeal[] = deals.map((d: any) => ({
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
