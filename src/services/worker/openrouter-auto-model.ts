/**
 * Automatic OpenRouter model selection for CLAUDE_MEM_OPENROUTER_MODEL="auto".
 * Discovers free models from the public /models API, filters to viable
 * summarization models, and ranks best-first. Pure except for the fetch and a
 * module-level last-good cache (fallback when a later discovery fails).
 * Spec: docs/superpowers/specs/2026-07-09-openrouter-auto-model-selection-design.md
 */

import { logger } from '../../utils/logger.js';

export const AUTO_MODEL_SENTINEL = 'auto';

const MODELS_URL = 'https://openrouter.ai/api/v1/models';
const TOP_N = 3;
const MIN_CONTEXT_LENGTH = 128_000;
const MIN_PARSED_PARAMS_B = 10;
/** Categorically wrong for structured summarization, whatever their size. */
const SLUG_BLOCKLIST = [/content-safety/i, /guard/i, /-nano/i];

export interface OpenRouterModelInfo {
  id: string;
  hugging_face_id?: string;
  description?: string;
  context_length?: number;
  created?: number;
  architecture?: { modality?: string };
}

/**
 * Total parameter count in billions, parsed from the slug/HF id ("550b-a55b"
 * → 550; the first `<n>b` token is the total, actives come second), falling
 * back to the description ("295B total"). Null when nothing parses — the
 * /models API has no structured size field.
 */
export function parseParamsB(m: OpenRouterModelInfo): number | null {
  for (const src of [m.id, m.hugging_face_id ?? '']) {
    const match = src.toLowerCase().match(/(\d+(?:\.\d+)?)b\b/);
    if (match) return parseFloat(match[1]);
  }
  const desc = (m.description ?? '').match(/(\d+(?:\.\d+)?)\s*b(?:illion)?\s*(?:total|parameters)/i);
  return desc ? parseFloat(desc[1]) : null;
}

export function filterAndRankModels(models: OpenRouterModelInfo[]): string[] {
  const ranked = models
    .filter((m) =>
      m.id.endsWith(':free') &&
      m.architecture?.modality === 'text->text' &&
      (m.context_length ?? 0) >= MIN_CONTEXT_LENGTH &&
      !SLUG_BLOCKLIST.some((re) => re.test(m.id)),
    )
    .map((m) => ({ m, params: parseParamsB(m) }))
    // Sub-10B parsed models are excluded; unparseable sizes stay (ranked below).
    .filter(({ params }) => params === null || params >= MIN_PARSED_PARAMS_B)
    .sort((a, b) => {
      if (a.params !== null && b.params !== null && a.params !== b.params) return b.params - a.params;
      if ((a.params === null) !== (b.params === null)) return a.params === null ? 1 : -1;
      const ctx = (b.m.context_length ?? 0) - (a.m.context_length ?? 0);
      if (ctx !== 0) return ctx;
      return (b.m.created ?? 0) - (a.m.created ?? 0);
    });
  return ranked.slice(0, TOP_N).map(({ m }) => m.id);
}

/** Last successful ranked list — in-memory only (spec: no disk cache). */
let lastGood: string[] | null = null;

/**
 * Fetch + rank, per session start. On failure, fall back to the last
 * successful list from this worker process; with none, throw loudly (spec:
 * never silently generate nothing).
 */
export async function resolveAutoModels(fetchImpl: typeof fetch = fetch): Promise<string[]> {
  try {
    const response = await fetchImpl(MODELS_URL);
    if (!response.ok) throw new Error(`models API returned status ${response.status}`);
    const json = await response.json() as { data?: OpenRouterModelInfo[] };
    const ranked = filterAndRankModels(json.data ?? []);
    if (ranked.length === 0) throw new Error('no candidate models after filtering');
    lastGood = ranked;
    logger.debug('SDK', 'OpenRouter auto-model list resolved', { models: ranked });
    return ranked;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (lastGood) {
      logger.warn('SDK', 'OpenRouter auto-model discovery failed; using last-good list', { message, lastGood });
      return lastGood;
    }
    throw new Error(`OpenRouter auto-model discovery failed and no cached list is available: ${message}`);
  }
}

/** Test seam: clears the last-good cache. */
export function __resetAutoModelCache(): void {
  lastGood = null;
}
