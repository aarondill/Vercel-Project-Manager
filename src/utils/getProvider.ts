import { Providers, type Provider } from "../features/models";

// Returns null if the input is not a supported git provider
export function getProvider(input: Record<string, string>): Provider | null {
  const firstKey = Object.keys(input)[0];
  return Providers.find(p => firstKey.startsWith(p)) ?? null;
}
