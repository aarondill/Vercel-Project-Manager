/** Returns undefined if not valid json or not an object */
export function parseJsonObject<T extends Record<PropertyKey, unknown>>(
  json: string
): T | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json) as unknown;
  } catch (error) {
    return;
  }
  if (!parsed) return;
  if (typeof parsed !== "object") return;
  return parsed;
}
