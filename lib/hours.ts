// Café opening hours, as structured data, so the public hours display, the
// booking slot generation, and the booking API all agree on when we're open.
// Weekday indices follow JS getUTCDay(): 0 = Sunday … 6 = Saturday.
//
// The hours are editable in the admin portal and stored as JSON in the
// `opening_hours` site setting. DEFAULT_WEEK is the fallback shape used when
// nothing has been saved yet.

export const CAFE_TZ = "Africa/Johannesburg";

export type TimeRange = { start: string; end: string }; // "HH:MM" 24h
export type DayHours = { closed: boolean; ranges: TimeRange[]; note?: string };
export type WeekHours = DayHours[]; // length 7, index 0 = Sunday … 6 = Saturday

// Default schedule:
//   Mon CLOSED · Tue–Thu 09:00–17:00 · Fri 09:00–12:00 / 13:30–22:00 (prayer) ·
//   Sat 09:00–22:00 · Sun 09:00–17:00
export const DEFAULT_WEEK: WeekHours = [
  { closed: false, ranges: [{ start: "09:00", end: "17:00" }] }, // 0 Sun
  { closed: true, ranges: [] }, // 1 Mon
  { closed: false, ranges: [{ start: "09:00", end: "17:00" }] }, // 2 Tue
  { closed: false, ranges: [{ start: "09:00", end: "17:00" }] }, // 3 Wed
  { closed: false, ranges: [{ start: "09:00", end: "17:00" }] }, // 4 Thu
  { closed: false, ranges: [{ start: "09:00", end: "12:00" }, { start: "13:30", end: "22:00" }], note: "Closed 12:00 – 13:30 for prayer" }, // 5 Fri
  { closed: false, ranges: [{ start: "09:00", end: "22:00" }] }, // 6 Sat
];

const TIME_RE = /^\d{2}:\d{2}$/;

// Parse the stored JSON setting into a safe 7-day week, falling back to the
// default for anything malformed.
export function parseWeek(json: string | null | undefined): WeekHours {
  if (!json) return DEFAULT_WEEK;
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed) || parsed.length !== 7) return DEFAULT_WEEK;
    return parsed.map((d): DayHours => {
      const ranges = Array.isArray(d?.ranges)
        ? d.ranges
            .filter((r: unknown) => {
              const rr = r as TimeRange;
              return rr && TIME_RE.test(rr.start) && TIME_RE.test(rr.end);
            })
            .map((r: TimeRange) => ({ start: r.start, end: r.end }))
        : [];
      const note = typeof d?.note === "string" && d.note.trim() ? d.note.trim() : undefined;
      return { closed: !!d?.closed, ranges, note };
    });
  } catch {
    return DEFAULT_WEEK;
  }
}

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
export function slotsForWeekday(week: WeekHours, weekday: number): string[] {
  const day = week[weekday];
  if (!day || day.closed) return [];
  const slots: string[] = [];
  for (const range of day.ranges) {
    const end = toMinutes(range.end);
    for (let t = toMinutes(range.start); t < end; t += 60) {
      slots.push(fromMinutes(t));
    }
  }
  return slots;
}

export function slotsForDate(week: WeekHours, dateStr: string): string[] {
  return slotsForWeekday(week, weekdayOf(dateStr));
}

export function isOpenOn(week: WeekHours, dateStr: string): boolean {
  return slotsForDate(week, dateStr).length > 0;
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
export const WEEKDAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Mon-first display order (Mon, Tue, Wed, Thu, Fri, Sat, Sun).
export const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

// A day's hours as a single string, e.g. "09:00 – 17:00" or "Closed" or
// "09:00 – 12:00 / 13:30 – 22:00".
export function formatDay(day: DayHours): string {
  if (day.closed || day.ranges.length === 0) return "Closed";
  return day.ranges.map((r) => `${r.start} – ${r.end}`).join(" / ");
}

export type HoursGroup = { label: string; value: string; note?: string };

// Collapse consecutive days with identical hours into ranges, e.g.
// "Tue – Thu: 09:00 – 17:00". Returns rows in Mon-first display order.
export function groupWeek(week: WeekHours): HoursGroup[] {
  const groups: { start: number; end: number; value: string; note?: string }[] = [];
  for (const idx of DISPLAY_ORDER) {
    const day = week[idx] ?? { closed: true, ranges: [] };
    const value = formatDay(day);
    const note = day.note;
    const last = groups[groups.length - 1];
    if (last && last.value === value && last.note === note) {
      last.end = idx;
    } else {
      groups.push({ start: idx, end: idx, value, note });
    }
  }
  return groups.map((g) => ({
    label: g.start === g.end ? WEEKDAY_LABELS[g.start] : `${WEEKDAY_LABELS[g.start]} – ${WEEKDAY_LABELS[g.end]}`,
    value: g.value,
    note: g.note,
  }));
}
