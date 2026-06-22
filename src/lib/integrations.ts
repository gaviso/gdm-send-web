import { createAdminClient } from "./supabase-server";

export type IntegrationProvider =
  | "backblaze_b2"
  | "resend"
  | "smtp"
  | "slack";

interface CacheEntry {
  config: Record<string, string> | null;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const TTL_MS = 60_000;

/**
 * Returns the active config for a provider stored in the DB, or null if
 * there is no row (or the row is inactive). Callers should fall back to
 * env vars when this returns null.
 */
export async function getIntegrationConfig(
  provider: IntegrationProvider
): Promise<Record<string, string> | null> {
  const cached = cache.get(provider);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.config;
  }
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("integrations")
      .select("config, is_active")
      .eq("provider", provider)
      .maybeSingle();

    const config =
      data && data.is_active ? (data.config as Record<string, string>) : null;
    cache.set(provider, { config, expiresAt: Date.now() + TTL_MS });
    return config;
  } catch {
    return null;
  }
}

export function invalidateIntegrationCache(provider?: IntegrationProvider) {
  if (provider) cache.delete(provider);
  else cache.clear();
}
