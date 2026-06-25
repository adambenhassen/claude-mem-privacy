/**
 * Public redaction API + count-only logging. The surfaces:
 *  - redactForLLM: pre-compression, applied at the shared prompt builders.
 *  - redactText / redactFields: pre-persistence (SQLite, Chroma).
 *
 * Logging emits ONLY per-category counts — never the matched values.
 */

import { logger } from '../../utils/logger.js';
import { redact } from './redactor.js';

export { redact } from './redactor.js';
export type { RedactResult } from './redactor.js';

function logCounts(
  surface: string,
  project: string | undefined,
  counts: Record<string, number>
): void {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total > 0) {
    logger.info('REDACT', 'redaction applied', { surface, project, counts });
  }
}

export function redactForLLM(text: string, ctx: { project?: string } = {}): string {
  const { text: out, counts } = redact(text, ctx);
  logCounts('llm-input', ctx.project, counts);
  return out;
}

/**
 * Deep LLM-input redaction: the synchronous regex core (always) PLUS, when the
 * optional Presidio sidecar is enabled, an ML NER pass for free-form PII
 * (names/locations/orgs/addresses). Any sidecar failure falls back to the regex
 * result — never throws, never blocks beyond the configured timeout.
 */
export async function redactForLLMDeep(text: string, ctx: { project?: string } = {}): Promise<string> {
  const regexed = redactForLLM(text, ctx);
  try {
    const { PresidioManager } = await import('../../services/redaction/PresidioManager.js');
    const { text: out, counts } = await PresidioManager.getInstance().anonymize(regexed, ctx);
    logCounts('llm-input-ner', ctx.project, counts);
    return out;
  } catch {
    return regexed;
  }
}

export function redactText(
  text: string,
  ctx: { project?: string; surface?: string } = {}
): string {
  const { text: out, counts } = redact(text, { project: ctx.project });
  logCounts(ctx.surface ?? 'persist', ctx.project, counts);
  return out;
}

export function redactFields<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[],
  ctx: { project?: string; surface?: string } = {}
): T {
  const merged: Record<string, number> = {};
  const clone: T = { ...obj };
  const opts = { project: ctx.project };

  for (const f of fields) {
    const v = clone[f];
    if (typeof v === 'string') {
      const { text, counts } = redact(v, opts);
      clone[f] = text as T[keyof T];
      for (const [k, n] of Object.entries(counts)) merged[k] = (merged[k] ?? 0) + n;
    } else if (Array.isArray(v)) {
      clone[f] = v.map((item) => {
        if (typeof item !== 'string') return item;
        const { text, counts } = redact(item, opts);
        for (const [k, n] of Object.entries(counts)) merged[k] = (merged[k] ?? 0) + n;
        return text;
      }) as T[keyof T];
    }
  }

  logCounts(ctx.surface ?? 'persist', ctx.project, merged);
  return clone;
}
