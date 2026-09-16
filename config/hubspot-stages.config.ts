// Deal stage IDs for the Spain sales pipeline (1046817014), confirmed live
// against real deal records in the HubSpot portal (25084478, EU1) on 15/9/26.
// Do NOT guess new IDs here for other pipelines - if a stage isn't listed,
// look it up the same way (query real deals in that pipeline) before using it.

export const SPAIN_PIPELINE_ID = "1046817014";

export const STAGE_IDS = {
  OUTBOUND_LEADS_BACKLOG: "1452703992",
  OUTBOUND_LEADS_TO_CONTACT: "1533160648",
  ATTEMPTING_TO_CONTACT: "1452704954",
  CONVERSATION_HAPPENING: "1452704955",
  MEETING_SCHEDULED: "1895535834",
  MEETING_COMPLETED: "3129279693",
  NEED_TO_RESCHEDULE: "3129329876",
  PROSPECT_TESTING: "3129237705",
  PRICE_OFFER: "3127958727",
  AGREEMENT_PREPARATION: "3134713062",
  WON_DEAL: "1452704958",
  UPSELL_CROSS_SELL: "3288684740",
  ENROLLED_IN_WARMUP: "2478337260",
  LOST_DEAL: "1452715199",
} as const;

export const STAGE_LABELS: Record<string, string> = {
  [STAGE_IDS.OUTBOUND_LEADS_BACKLOG]: "Outbound leads backlog",
  [STAGE_IDS.OUTBOUND_LEADS_TO_CONTACT]: "Outbound leads to contact",
  [STAGE_IDS.ATTEMPTING_TO_CONTACT]: "Attempting to contact",
  [STAGE_IDS.CONVERSATION_HAPPENING]: "Conversation happening",
  [STAGE_IDS.MEETING_SCHEDULED]: "Meeting scheduled",
  [STAGE_IDS.MEETING_COMPLETED]: "Meeting completed",
  [STAGE_IDS.NEED_TO_RESCHEDULE]: "Need to reschedule",
  [STAGE_IDS.PROSPECT_TESTING]: "Prospect testing",
  [STAGE_IDS.PRICE_OFFER]: "Price offer",
  [STAGE_IDS.AGREEMENT_PREPARATION]: "Agreement preparation",
  [STAGE_IDS.WON_DEAL]: "Won deal",
  [STAGE_IDS.UPSELL_CROSS_SELL]: "Upsell / Cross sell",
  [STAGE_IDS.ENROLLED_IN_WARMUP]: "Enrolled in warm-up",
  [STAGE_IDS.LOST_DEAL]: "Lost deal",
};

/**
 * Which deal property flags a deal as outbound. Resolved 16/9/26 by
 * inspecting the filter definitions of the team's own live HubSpot reports
 * (the "Spain - NB CVR% Outbound" dashboard and its per-SDR variants,
 * portal 25084478) rather than guessing between the 3 original candidates:
 * those reports filter on lead_master_source = "false", confirmed by the
 * property's own description ("...by the sales team through cold call,
 * cold email (outbound)" = "false"; inbound = "true"). Wired in below.
 */
export const OUTBOUND_FILTER_PROPERTY: null | {
  property: "lead_master_source";
  outboundValue: string;
} = { property: "lead_master_source", outboundValue: "false" };

/**
 * The same live reports also restrict to non-existing-client companies
 * (new business), via company_master_type != "Existing client" - a deal
 * on an existing client account (upsell/cross-sell) doesn't count as
 * outbound prospecting even if lead_master_source says outbound. Matches
 * this portal's own definition: company_master_type is synced from the
 * associated company's status - "Existing client" if status is "Client" or
 * "Blocked", "Non client" otherwise.
 */
export const NEW_BUSINESS_FILTER_PROPERTY: { property: "company_master_type"; excludeValue: string } = {
  property: "company_master_type",
  excludeValue: "Existing client",
};
