// Café opening hours, as structured data, so the public hours display, the
// booking slot generation, and the booking API all agree on when we're open.
// Weekday indices follow JS getUTCDay(): 0 = Sunday … 6 = Saturday.

export const CAFE_TZ = "Africa/Johannesburg";

export type TimeRange = { start: string; end: string }; // "HH:MM" 24h

// Mirrors the hours shown on the site:
//   Mon CLOSED · Tue–Thu 09:00–17:00 · Fri 09:00–12:00 / 13:30–22:00 ·
//   Sat 09:00–22:00 · Sun 09:00–17:00
export const OPENING_HOURS: Record<number, TimeRange[]> = {
  0: [{ start: "09:00", end: "17:00" }], // Sunday
  1: [], // Monday — closed
  2: [{ start: "09:00", end: "17:00" }], // Tuesday
  3: [{ start: "09:00", end: "17:00" }], // Wednesday
  4: [{ start: "09:00", end: "17:00" }], // Thursday
  5: [{ start: "09:00", end: "12:00" }, { start: "13:30", end: "22:00" }], // Friday (split)
  6: [{ start: "09:00", end: "22:00" }], // Saturday
};

export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function fromMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Weekday for a YYYY-MM-DD string, timezone-independent.
export function weekdayOf(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

// Hourly arrival slots for a given weekday, stepping 1h from each range start.
export function slotsForWeekday(weekday: number): string[] {
  const ranges = OPENING_HOURS[weekday] ?? [];
  const slots: string[] = [];
  for (const range of ranges) {
    const end = toMinutes(range.end);
    for (let t = toMinutes(range.start); t < end; t += 60) {
      slots.push(fromMinutes(t));
    }
  }
  return slots;
}

export function slotsForDate(dateStr: string): string[] {
  return slotsForWeekday(weekdayOf(dateStr));
}

export function isOpenOn(dateStr: string): boolean {
  return slotsForDate(dateStr).length > 0;
}

// Today's date as YYYY-MM-DD in the café's timezone.
export function todayInCafeTZ(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CAFE_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
