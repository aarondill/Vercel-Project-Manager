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
