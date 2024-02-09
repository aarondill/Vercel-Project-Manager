import { objectKeys } from "tsafe";

/** Format Dates like 12/31/2022 10:31 PM */
export function formatDate(
  date: Date,
  options?: Intl.DateTimeFormatOptions
): string {
  options ??= {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
    hour: "numeric",
    minute: "numeric",
  };
  return date.toLocaleDateString(undefined, options);
}

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

/**
 * Get language-sensitive relative time message from Dates.
 * Such as: 1 day ago or 23 hours ago
 * @param relative  - the relative dateTime, generally is in the past or future
 * @param pivot     - the dateTime of reference, generally is the current time
 */
export function relativeTimeFromDates(
  relative: Date,
  pivot: Date = new Date()
): string {
  return relativeTimeFromElapsed(relative.getTime() - pivot.getTime());
}

/**
 * Get language-sensitive relative time message from elapsed time.
 * @param elapsed   - the elapsed time in milliseconds
 */
export function relativeTimeFromElapsed(elapsed: number): string {
  const second = 1000,
    minute = 60 * second,
    hour = 60 * minute,
    day = 24 * hour,
    month = 30 * day,
    year = 12 * month;
  const units = { year, month, day, hour, minute, second } as const;
  const unit =
    objectKeys(units).find(u => Math.abs(elapsed) < units[u]) ?? "second";
  return rtf.format(Math.round(elapsed / units[unit]), unit);
}
