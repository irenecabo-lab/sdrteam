import { COMPETITION } from "@/config/scoring.config";

/** Today's calendar date (YYYY-MM-DD) in the competition's timezone. */
export function todayLocal(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: COMPETITION.timezone }).format(new Date());
}

/** Converts an ISO timestamp to a YYYY-MM-DD calendar date in the competition's timezone. */
export function toLocalDate(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: COMPETITION.timezone }).format(new Date(iso));
}

export function isWithinCompetitionWindow(dateStr: string): boolean {
  return dateStr >= COMPETITION.startDate && dateStr <= COMPETITION.endDate;
}

/** Every calendar date in the competition, inclusive, as YYYY-MM-DD strings. */
export function competitionDates(): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${COMPETITION.startDate}T00:00:00`);
  const end = new Date(`${COMPETITION.endDate}T00:00:00`);
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export function currentLocalTime(): { hh: string; mm: string } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: COMPETITION.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const hh = parts.find((p) => p.type === "hour")?.value ?? "00";
  const mm = parts.find((p) => p.type === "minute")?.value ?? "00";
  return { hh, mm };
}

/** Days/hours left until COMPETITION.endDate 23:59:59 local time. */
export function timeLeft(): { days: number; hours: number; ended: boolean } {
  const endMs = new Date(`${COMPETITION.endDate}T23:59:59+02:00`).getTime(); // CEST offset; good enough for a Sept-only window
  const diffMs = endMs - Date.now();
  if (diffMs <= 0) return { days: 0, hours: 0, ended: true };
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  return { days: Math.floor(hours / 24), hours: hours % 24, ended: false };
}
