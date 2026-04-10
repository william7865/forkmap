// ============================================================
// lib/opening-hours.ts — OSM opening_hours parser
// Parses the opening_hours OSM tag format to determine if
// a place is currently open. No external dependencies.
// Spec: https://wiki.openstreetmap.org/wiki/Key:opening_hours
// ============================================================

/**
 * Day abbreviation → JS getDay() index (0=Sun)
 */
const DAY_MAP: Record<string, number> = {
  su: 0, mo: 1, tu: 2, we: 3, th: 4, fr: 5, sa: 6,
};

function parseTime(t: string): number {
  // Returns minutes since midnight. Handles "HH:MM" and "HH:MM:SS"
  const parts = t.trim().split(":").map(Number);
  return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
}

function expandDayRange(range: string): number[] {
  // "Mo-Fr" → [1,2,3,4,5], "Sa,Su" → [6,0]
  const days: number[] = [];
  for (const part of range.split(",")) {
    const lr = part.trim().toLowerCase().split("-");
    if (lr.length === 1) {
      const d = DAY_MAP[lr[0]];
      if (d !== undefined) days.push(d);
    } else {
      let start = DAY_MAP[lr[0]] ?? 0;
      const end   = DAY_MAP[lr[1]] ?? 6;
      // Handle wrap-around (Sa-Mo)
      while (true) {
        days.push(start);
        if (start === end) break;
        start = (start + 1) % 7;
        if (days.length > 7) break; // safety
      }
    }
  }
  return days;
}

/**
 * Determine if a place is open now given its OSM opening_hours string.
 * Returns true/false/null (null = unparseable).
 *
 * Handles the most common formats:
 *  - "24/7"
 *  - "Mo-Fr 09:00-22:00"
 *  - "Mo-Sa 08:00-20:00; Su 10:00-18:00"
 *  - "Mo,We,Fr 12:00-14:00,19:00-22:00"
 *  - "off" / "closed"
 */
export function isOpenNow(opening_hours: string, now = new Date()): boolean | null {
  if (!opening_hours) return null;
  const raw = opening_hours.trim().toLowerCase();

  if (raw === "24/7") return true;
  if (raw === "off" || raw === "closed") return false;

  const currentDay  = now.getDay(); // 0=Sun
  const currentMins = now.getHours() * 60 + now.getMinutes();

  // Split by semicolons — each is a rule
  const rules = raw.split(";").map(s => s.trim()).filter(Boolean);

  for (const rule of rules) {
    if (!rule) continue;

    // Check if "off" at end
    const isOff = rule.endsWith(" off") || rule.endsWith("\toff");
    const ruleBody = isOff ? rule.replace(/\s+off$/, "").trim() : rule;

    // Split day spec from time spec
    // Pattern: "mo-fr 09:00-22:00" or "09:00-22:00" (no day = all days)
    const timeRegex = /(\d{1,2}:\d{2})/;
    const firstTimeIdx = ruleBody.search(timeRegex);

    let daySpec = "mo-su"; // default: all days
    let timeSpec = ruleBody;

    if (firstTimeIdx > 0) {
      daySpec  = ruleBody.slice(0, firstTimeIdx).trim().replace(/,$/, "").trim();
      timeSpec = ruleBody.slice(firstTimeIdx).trim();
    } else if (firstTimeIdx < 0) {
      // No time found — probably just a day spec or unknown format
      continue;
    }

    if (!daySpec) daySpec = "mo-su";

    // Expand days
    const days = expandDayRange(daySpec || "mo-su");
    if (!days.includes(currentDay)) continue;

    if (isOff) return false;

    // Parse time ranges — may be comma-separated "09:00-12:00,14:00-20:00"
    const timeRanges = timeSpec.split(",").map(s => s.trim()).filter(s => s.includes("-"));
    for (const range of timeRanges) {
      const [startStr, endStr] = range.split("-");
      if (!startStr || !endStr) continue;
      const start = parseTime(startStr);
      let   end   = parseTime(endStr);
      // Overnight hours (e.g. 22:00-02:00)
      if (end < start) end += 24 * 60;
      const adjustedMins = end < start ? currentMins + 24 * 60 : currentMins;
      if (adjustedMins >= start && adjustedMins < end) return true;
    }
  }

  return false;
}

/**
 * Format today's hours for display.
 * Returns e.g. "09:00 – 22:00" or null.
 */
export function getTodayHours(opening_hours: string, now = new Date()): string | null {
  if (!opening_hours) return null;
  const raw = opening_hours.trim().toLowerCase();
  if (raw === "24/7") return "24h/24";
  if (raw === "off" || raw === "closed") return "Fermé";

  const currentDay = now.getDay();
  const rules = raw.split(";").map(s => s.trim()).filter(Boolean);

  for (const rule of rules) {
    const timeRegex = /(\d{1,2}:\d{2})/;
    const firstTimeIdx = rule.search(timeRegex);
    if (firstTimeIdx < 0) continue;

    const daySpec  = rule.slice(0, firstTimeIdx).trim().replace(/,$/, "").trim() || "mo-su";
    const timeSpec = rule.slice(firstTimeIdx).trim();
    const days = expandDayRange(daySpec);

    if (!days.includes(currentDay)) continue;

    // Format time ranges nicely
    return timeSpec
      .split(",")
      .map(r => {
        const [a, b] = r.trim().split("-");
        if (!a || !b) return r;
        return `${a.trim()} – ${b.trim()}`;
      })
      .join(", ");
  }
  return null;
}

/**
 * Full week schedule as array indexed by day (0=Sun).
 */
export function getWeekSchedule(opening_hours: string): Array<{ day: string; hours: string } | null> {
  const DAYS_FR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  return DAYS_FR.map((dayLabel, dayIdx) => {
    const hours = getTodayHours(opening_hours, (() => {
      const d = new Date();
      const diff = dayIdx - d.getDay();
      d.setDate(d.getDate() + diff);
      return d;
    })());
    if (!hours) return null;
    return { day: dayLabel, hours };
  });
}
