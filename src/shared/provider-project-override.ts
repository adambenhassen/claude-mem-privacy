export type Provider = 'claude' | 'gemini' | 'openrouter' | 'custom';

export interface ProjectOverride {
  provider: Provider;
  /** Optional per-project model id; when unset the provider's global model is used. */
  model?: string;
}

const VALID: Provider[] = ['claude', 'gemini', 'openrouter', 'custom'];

function isProvider(v: unknown): v is Provider {
  return typeof v === 'string' && (VALID as string[]).includes(v);
}

/**
 * Resolve a per-project override from the JSON map stored in
 * CLAUDE_MEM_PROVIDER_PROJECT_OVERRIDES. Each entry is either a bare provider
 * string ("custom") or an object ({ provider, model }). Returns the resolved
 * { provider, model? } for `project`, or null when there is no entry / the map
 * or value is invalid.
 *
 * Invalid JSON or a malformed entry is ignored (returns null) rather than
 * thrown so a misconfiguration can never break provider selection — the caller
 * falls back to the global CLAUDE_MEM_PROVIDER.
 */
export function resolveProviderOverride(project: string | undefined, raw: string): ProjectOverride | null {
  if (!project || !raw) return null;
  let map: Record<string, unknown>;
  try {
    map = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!map || typeof map !== 'object' || Array.isArray(map)) return null;

  const v = map[project];
  if (isProvider(v)) {
    return { provider: v };
  }
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const { provider, model } = v as { provider?: unknown; model?: unknown };
    if (!isProvider(provider)) return null;
    return typeof model === 'string' && model.trim()
      ? { provider, model: model.trim() }
      : { provider };
  }
  return null;
}
