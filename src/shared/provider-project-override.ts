export type Provider = 'claude' | 'gemini' | 'openrouter' | 'custom';

const VALID: Provider[] = ['claude', 'gemini', 'openrouter', 'custom'];

/**
 * Resolve a per-project provider override from the JSON map stored in
 * CLAUDE_MEM_PROVIDER_PROJECT_OVERRIDES. Returns the overridden provider for
 * `project`, or null when there is no entry / the map or value is invalid.
 *
 * Invalid JSON is ignored (returns null) rather than thrown so a
 * misconfiguration can never break provider selection — the caller falls back
 * to the global CLAUDE_MEM_PROVIDER.
 */
export function resolveProviderOverride(project: string | undefined, raw: string): Provider | null {
  if (!project || !raw) return null;
  let map: Record<string, unknown>;
  try {
    map = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!map || typeof map !== 'object') return null;
  const v = map[project];
  return typeof v === 'string' && (VALID as string[]).includes(v) ? (v as Provider) : null;
}
