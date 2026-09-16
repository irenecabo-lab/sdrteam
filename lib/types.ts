// Canonical data shape every provider (manual or HubSpot) must return.
// The scoring engine and the UI only ever talk to this shape - they never
// know or care whether the numbers came from a JSON file or a live HubSpot
// query. Keep this the single source of truth for "what does a competition
// snapshot look like".

export interface DailyActivity {
  ownerId: string;
  date: string; // YYYY-MM-DD, Europe/Madrid calendar day
  calls: number;
  talkTimeMinutes: number;
  qualityCalls: number; // calls >= QUALITY_CALL_MIN_SECONDS
}

export interface DealStageEvent {
  dealId: string;
  dealName: string;
  companyName: string;
  ownerId: string;
  fromStageId: string;
  toStageId: string;
  timestamp: string; // ISO 8601
}

export type MeetingOutcome = "SCHEDULED" | "COMPLETED" | "NO_SHOW" | "CANCELED" | "RESCHEDULED";

export interface MeetingRecord {
  meetingId: string;
  dealId: string;
  dealName: string;
  companyName: string;
  ownerId: string;
  bookedAt: string; // ISO 8601 - hs_createdate
  meetingAt: string; // ISO 8601 - hs_meeting_start_time
  outcome: MeetingOutcome;
  /** DEAL.fleet_size at the time the meeting was booked. Undefined = unknown. */
  fleetSize?: number;
}

export interface PipelineDeal {
  dealId: string;
  dealName: string;
  companyName: string;
  ownerId: string;
  amountEur: number; // amount_in_home_currency
  createdAt: string; // ISO 8601
}

export interface CompetitionSnapshot {
  generatedAt: string; // ISO 8601
  source: "manual" | "hubspot";
  dailyActivity: DailyActivity[];
  dealStageEvents: DealStageEvent[];
  meetings: MeetingRecord[];
  pipelineDeals: PipelineDeal[];
}

export interface DataProvider {
  getSnapshot(): Promise<CompetitionSnapshot>;
}
