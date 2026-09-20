// Every number that drives the game's math lives here. Change values, not
// the engine in lib/scoring/*.ts.

// Ventana real de la competición. Revertida el 20/9/26 tras la prueba con
// datos reales del 16-18/9 (ventana temporal ya retirada junto con el
// reseteo de data/competition-data.json).
export const COMPETITION = {
  name: "MAPON OUTBOUND BATTLE",
  startDate: "2026-09-22", // inclusive, Europe/Madrid calendar day
  endDate: "2026-09-30", // inclusive, Europe/Madrid calendar day
  timezone: "Europe/Madrid",
};

// ---------- Capa 0: pipeline stage-transition points ----------
// Confirmed 15/9/26: every time a deal crosses one of these exact stage
// boundaries during the competition window, the owner's team scores the
// points below, once per deal per transition (not divided among teammates).
import { STAGE_IDS } from "./hubspot-stages.config";

export const STAGE_TRANSITION_POINTS: { from: string; to: string; points: number; label: string }[] = [
  {
    from: STAGE_IDS.OUTBOUND_LEADS_TO_CONTACT,
    to: STAGE_IDS.ATTEMPTING_TO_CONTACT,
    points: 2,
    label: "Empresa nueva de outbound metida en el pipe",
  },
  {
    from: STAGE_IDS.ATTEMPTING_TO_CONTACT,
    to: STAGE_IDS.CONVERSATION_HAPPENING,
    points: 5,
    label: "Contacto con la persona clave",
  },
  {
    from: STAGE_IDS.CONVERSATION_HAPPENING,
    to: STAGE_IDS.MEETING_SCHEDULED,
    points: 10,
    label: "Meeting agendada",
  },
];

// ---------- Capa 1: activity, normalized by each team's collective target ----------
// points = weight * min(teamActual / teamCollectiveTarget, cap)
export const ACTIVITY_WEIGHTS = {
  calls: 30,
  talkTimeMinutes: 50,
  meetingsBooked: 80,
};
export const ACTIVITY_COMPLETION_CAP = 1.5; // 150%

// ---------- Capa 2: result bonuses (flat, never split across teammates) ----------
export const BONUS_POINTS = {
  qualityCall: 3, // per call over the quality-call duration threshold
  meetingHeld: 10, // per meeting with outcome COMPLETED
  quickCapture: 10, // meeting booked AND held within the competition window
};

export const QUALITY_CALL_MIN_SECONDS = 180; // "+3 min calls"

// ---------- Fleet captures ----------
// fleetSize comes from the DEAL.fleet_size property (confirmed 15/9/26 -
// see the proposal doc section 4). Tiers are inclusive on the low end.
export const FLEET_TIERS = [
  { id: "COMMON", label: "Common", min: 1, max: 19, points: 5, color: "#9fb0e8" },
  { id: "UNCOMMON", label: "Uncommon", min: 20, max: 49, points: 10, color: "#2be3ff" },
  { id: "RARE", label: "Rare", min: 50, max: 99, points: 20, color: "#7c5cff" },
  { id: "EPIC", label: "Epic", min: 100, max: 199, points: 35, color: "#b46bff" },
  { id: "LEGENDARY", label: "Legendary", min: 200, max: 499, points: 60, color: "#ffcb47" },
  { id: "MYTHIC", label: "Mythic", min: 500, max: Infinity, points: 100, color: "#ff3d7f" },
] as const;

export function fleetTierFor(fleetSize: number) {
  return FLEET_TIERS.find((t) => fleetSize >= t.min && fleetSize <= t.max) ?? null;
}

// ---------- TOCHA (BOOST POR EMPRESAS TOCHAS) ----------
// Confirmed 15/9/26: a deal counts as TOCHA when its fleet_size is >= this
// threshold. The +50 bonus fires when the MEETING is created for that deal
// (not at deal creation, not at any later stage). UI label is "BOOST POR
// EMPRESAS TOCHAS" - "tocha" is kept as the internal name only.
export const TOCHA_MIN_FLEET_SIZE = 50;
export const TOCHA_BONUS_POINTS = 50;

// ---------- Pipeline ----------
// Linear conversion, no cap: every EUR_PER_POINT of amount_in_home_currency
// on an in-scope deal created during the window is worth 1 point.
export const PIPELINE_EUR_PER_POINT = 500;

// ---------- XP & levels ----------
// XP is a separate visual-only track. For now it mirrors total team points
// 1:1 (XP_MULTIPLIER = 1) - bump the multiplier if points and XP should
// diverge later.
export const XP_MULTIPLIER = 1;

export const LEVELS = [
  { level: 1, name: "Rookie", xpFrom: 0 },
  { level: 2, name: "Prospector", xpFrom: 100 },
  { level: 3, name: "Hunter", xpFrom: 300 },
  { level: 4, name: "Closer", xpFrom: 600 },
  { level: 5, name: "Outbound Master", xpFrom: 1000 },
] as const;

export function levelFor(xp: number) {
  let current: (typeof LEVELS)[number] = LEVELS[0];
  for (const l of LEVELS) {
    if (xp >= l.xpFrom) current = l;
  }
  const idx = LEVELS.findIndex((l) => l.level === current.level);
  const next = LEVELS[idx + 1] ?? null;
  const progressPct = next ? Math.min(100, Math.round(((xp - current.xpFrom) / (next.xpFrom - current.xpFrom)) * 100)) : 100;
  return { ...current, next, progressPct };
}

// ---------- Data refresh cadence ----------
// Confirmed 16/9/26 (updated same day from the original 09:00/17:30): two
// fixed pulls a day at 14:00 and 18:00, Europe/Madrid wall-clock time
// (DST-safe - see app/api/refresh/route.ts for how this is checked), plus
// the manual "Refresh Battle" button in the UI.
export const REFRESH_TIMES_LOCAL = ["14:00", "18:00"];
